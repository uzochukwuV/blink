// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title Blink - Streamlined Farcaster Social Betting for Base
 * @dev USDC-only betting with Base Pay integration
 * @notice Optimized for viral Farcaster engagement and OCS Awards
 */
contract Blink is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ CONSTANTS ============
    uint256 public constant HOUSE_EDGE = 300; // 3%

    // USD limits (8 decimals to match Chainlink)
    uint256 public constant MIN_BET_USD = 1e8; // $1.00 minimum
    uint256 public constant MAX_BET_USD = 100e8; // $100.00 maximum
    uint256 public constant DEFAULT_BET_USD = 5e8; // $5.00 default
    
    // Creator sponsorship requirements
    uint256 public constant MIN_CREATOR_STAKE_USD = 10e8; // $10.00 minimum stake
    uint256 public constant MAX_CREATOR_STAKE_USD = 1000e8; // $1000.00 maximum stake
    uint256 public constant CREATOR_REWARD_PERCENTAGE = 200; // 2% of total volume

    // Price feed staleness check (1 hour)
    uint256 public constant PRICE_STALENESS_THRESHOLD = 3600;

    // ============ ENUMS ============
    enum PredictionType {
        VIRAL_CAST, // Will this cast get X likes/recasts?
        POLL_OUTCOME, // Farcaster poll result prediction
        CHANNEL_GROWTH, // Channel follower/engagement growth
        CREATOR_MILESTONE // Creator hitting specific metrics
    }

    enum MarketStatus {
        ACTIVE,
        SETTLED,
        CANCELLED
    }

    // ============ STRUCTS (OPTIMIZED) ============

    struct Market {
        uint32 id;
        PredictionType predictionType;
        string title; // "Will @dwr's cast get 1000+ likes?"
        string targetId; // cast hash, poll id, channel name, or FID
        uint32 threshold; // 1000 likes, 500 recasts, etc.
        uint32 deadline; // betting closes (timestamp)
        uint128 yesPool; // USDC backing YES (fits in 128 bits)
        uint128 noPool; // USDC backing NO
        MarketStatus status;
        bool outcome; // Final outcome: true = YES won, false = NO won
        address creator;
        uint128 creatorStake; // USDC staked by creator
        uint128 totalVolume; // Total betting volume for creator rewards
        bool creatorRewarded; // Whether creator has claimed their reward
    }

    struct Bet {
        uint32 id;
        uint32 marketId;
        address bettor;
        bool outcome; // false = NO, true = YES
        uint128 amount; // USDC amount
        uint32 timestamp;
        bool settled;
        uint128 payout;
    }

    struct UserStats {
        uint32 totalBets;
        uint32 wins;
        uint32 losses;
        uint128 totalVolume; // For UI display like your mockup
        uint128 totalWinnings;
    }

    // ============ STATE VARIABLES ============
    IERC20 public immutable USDC;
    AggregatorV3Interface public immutable usdcPriceFeed;

    uint32 public marketCounter;
    uint32 public betCounter;
    uint128 public totalVolume;
    uint128 public houseTreasury;

    mapping(uint32 => Market) public markets;
    mapping(uint32 => Bet) public bets;
    mapping(address => UserStats) public userStats;
    mapping(address => uint32[]) public userBets;
    mapping(address => uint32[]) public userMarkets;
    mapping(address => bool) public oracles;
    mapping(address => uint128) public creatorStakes; // Track total stakes per creator
    mapping(address => uint128) public creatorRewards; // Accumulated rewards per creator

    // Market browsing - matches your UI
    uint32[] public activeMarkets;
    mapping(PredictionType => uint32[]) public marketsByType;

    // ============ EVENTS ============
    event MarketCreated(
        uint32 indexed marketId,
        PredictionType predictionType,
        string title,
        address indexed creator,
        uint32 threshold,
        uint32 deadline,
        uint128 creatorStake
    );
    
    event CreatorStakeWithdrawn(address indexed creator, uint128 amount);
    event CreatorRewardClaimed(address indexed creator, uint32 indexed marketId, uint128 reward);

    event BetPlaced(
        uint32 indexed betId,
        uint32 indexed marketId,
        address indexed bettor,
        bool outcome,
        uint128 amount,
        uint256 usdValue // USD value at time of bet
    );

    event MarketSettled(uint32 indexed marketId, bool outcome);
    event WinningsClaimed(
        uint32 indexed betId,
        address indexed winner,
        uint128 payout
    );
    event PriceFeedUpdated(int256 newPrice, uint256 timestamp);

    // ============ MODIFIERS ============
    modifier onlyOracle() {
        require(oracles[msg.sender] || msg.sender == owner(), "Not oracle");
        _;
    }

    modifier validMarket(uint32 _marketId) {
        require(_marketId <= marketCounter && _marketId > 0, "Invalid market");
        require(
            markets[_marketId].status == MarketStatus.ACTIVE,
            "Market not active"
        );
        require(block.timestamp < markets[_marketId].deadline, "Past deadline");
        _;
    }

    // ============ CONSTRUCTOR ============
    constructor(address _usdc, address _usdcPriceFeed) Ownable(msg.sender) {
        USDC = IERC20(_usdc);
        usdcPriceFeed = AggregatorV3Interface(_usdcPriceFeed);
        oracles[msg.sender] = true;
    }

    // ============ USER FUNCTIONS (ONLY EXTERNAL CALLS) ============

    /**
     * @dev Create market with creator stake - creators must sponsor their own bets
     * @param _type Type of prediction market
     * @param _title Human readable "Will @user's cast get 1000+ likes?"
     * @param _targetId Cast hash, poll ID, channel name, or user FID
     * @param _threshold Number threshold (likes, followers, etc.)
     * @param _duration Hours until betting closes
     * @param _creatorStake USDC amount creator stakes (minimum required)
     */
    function createMarket(
        PredictionType _type,
        string memory _title,
        string memory _targetId,
        uint32 _threshold,
        uint32 _duration,
        uint128 _creatorStake
    ) external nonReentrant returns (uint32) {
        require(_threshold >= 10, "Min 10 threshold");
        require(_duration >= 1 && _duration <= 168, "1-168 hours only"); // 1 week max
        require(bytes(_title).length <= 200, "Title too long");
        
        // Validate creator stake amount
        (uint128 minStake, uint128 maxStake) = getCreatorStakeLimits();
        require(_creatorStake >= minStake, "Creator stake too low");
        require(_creatorStake <= maxStake, "Creator stake too high");
        
        // Transfer creator stake to contract
        USDC.safeTransferFrom(msg.sender, address(this), _creatorStake);

        marketCounter++;
        uint32 marketId = marketCounter;
        uint32 deadline = uint32(block.timestamp + (_duration * 1 hours));

        markets[marketId] = Market({
            id: marketId,
            predictionType: _type,
            title: _title,
            targetId: _targetId,
            threshold: _threshold,
            deadline: deadline,
            yesPool: 0,
            noPool: 0,
            status: MarketStatus.ACTIVE,
            outcome: false,
            creator: msg.sender,
            creatorStake: _creatorStake,
            totalVolume: 0,
            creatorRewarded: false
        });
        
        // Track creator stakes
        creatorStakes[msg.sender] += _creatorStake;

        // Update indexes for UI browsing
        activeMarkets.push(marketId);
        marketsByType[_type].push(marketId);
        userMarkets[msg.sender].push(marketId);

        emit MarketCreated(
            marketId,
            _type,
            _title,
            msg.sender,
            _threshold,
            deadline,
            _creatorStake
        );
        return marketId;
    }

    /**
     * @dev Place bet with USDC - main user interaction
     * @param _marketId Market to bet on
     * @param _outcome true = YES, false = NO
     * @param _amount USDC amount (6 decimals)
     */
    function placeBet(
        uint32 _marketId,
        bool _outcome,
        uint128 _amount
    ) external nonReentrant validMarket(_marketId) returns (uint32) {
        // Validate bet amount using Chainlink price feed
        (uint128 minBet, uint128 maxBet) = getBetLimits();
        require(_amount >= minBet, "Bet too small");
        require(_amount <= maxBet, "Bet too large");

        // Transfer USDC from user
        USDC.safeTransferFrom(msg.sender, address(this), _amount);

        betCounter++;
        Market storage market = markets[_marketId];

        // Update pools
        if (_outcome) {
            market.yesPool += _amount;
        } else {
            market.noPool += _amount;
        }

        // Create bet
        bets[betCounter] = Bet({
            id: betCounter,
            marketId: _marketId,
            bettor: msg.sender,
            outcome: _outcome,
            amount: _amount,
            timestamp: uint32(block.timestamp),
            settled: false,
            payout: 0
        });

        // Update user stats for UI
        UserStats storage stats = userStats[msg.sender];
        stats.totalBets++;
        stats.totalVolume += _amount;
        userBets[msg.sender].push(betCounter);

        // Update global metrics and market volume
        totalVolume += _amount;
        market.totalVolume += _amount;

        // Get USD value for event
        uint256 usdValue = convertUSDCToUSD(_amount);

        emit BetPlaced(
            betCounter,
            _marketId,
            msg.sender,
            _outcome,
            _amount,
            usdValue
        );
        return betCounter;
    }

    /**
     * @dev Claim winnings - simplified withdrawal
     * @param _betId Bet ID to claim
     */
    function claimWinnings(uint32 _betId) external nonReentrant {
        Bet storage bet = bets[_betId];
        require(bet.bettor == msg.sender, "Not your bet");
        require(!bet.settled, "Already claimed");

        Market storage market = markets[bet.marketId];
        require(market.status == MarketStatus.SETTLED, "Not settled");

        bet.settled = true;
        uint128 payout = _calculatePayout(_betId);
        bet.payout = payout;

        // Update user stats
        UserStats storage stats = userStats[msg.sender];
        if (payout > 0) {
            stats.wins++;
            stats.totalWinnings += payout;
            USDC.safeTransfer(msg.sender, payout);
        } else {
            stats.losses++;
        }

        emit WinningsClaimed(_betId, msg.sender, payout);
    }

    // ============ ORACLE FUNCTIONS (ADMIN ONLY) ============

    /**
     * @dev Settle market with final outcome and handle creator rewards/penalties
     * @param _marketId Market to settle
     * @param _outcome Final outcome: true = YES won, false = NO won
     */
    function settleMarket(
        uint32 _marketId,
        bool _outcome
    ) external onlyOracle nonReentrant {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.ACTIVE, "Not active");
        require(block.timestamp >= market.deadline, "Not past deadline");

        market.status = MarketStatus.SETTLED;
        market.outcome = _outcome;

        // Calculate house edge from losing pool
        uint128 losingPool = _outcome ? market.noPool : market.yesPool;
        uint128 houseEdge = uint128((uint256(losingPool) * HOUSE_EDGE) / 10000);
        houseTreasury += houseEdge;

        // Calculate creator reward based on total volume
        uint128 creatorReward = uint128((uint256(market.totalVolume) * CREATOR_REWARD_PERCENTAGE) / 10000);
        
        // Creator gets their stake back plus volume-based reward
        if (market.totalVolume > 0) {
            creatorRewards[market.creator] += creatorReward;
        }
        
        // Creator can withdraw their stake after settlement
        creatorStakes[market.creator] -= market.creatorStake;

        // Remove from active markets
        _removeFromActiveMarkets(_marketId);

        emit MarketSettled(_marketId, _outcome);
    }

    /**
     * @dev Cancel market (emergency only) - creator loses stake as penalty
     * @param _marketId Market to cancel
     */
    function cancelMarket(uint32 _marketId) external onlyOracle {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.ACTIVE, "Not active");

        market.status = MarketStatus.CANCELLED;
        _removeFromActiveMarkets(_marketId);
        
        // Creator forfeits stake as penalty for cancelled market
        uint128 forfeitedStake = market.creatorStake;
        creatorStakes[market.creator] -= forfeitedStake;
        houseTreasury += forfeitedStake;

        // Users can claim full refunds for cancelled markets
    }

    // ============ CHAINLINK PRICE FUNCTIONS ============

    /**
     * @dev Get current USDC/USD price from Chainlink
     * @return price USDC price in USD (8 decimals)
     * @return timestamp Last update timestamp
     */
    function getUSDCPrice()
        public
        view
        returns (int256 price, uint256 timestamp)
    {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = usdcPriceFeed.latestRoundData();

        require(answer > 0, "Invalid price");
        require(updatedAt > 0, "Price not updated");
        require(
            block.timestamp - updatedAt <= PRICE_STALENESS_THRESHOLD,
            "Stale price"
        );

        return (answer, updatedAt);
    }

    /**
     * @dev Calculate min/max bet amounts in USDC based on USD limits
     * @return minBet Minimum bet in USDC (6 decimals)
     * @return maxBet Maximum bet in USDC (6 decimals)
     */
    function getBetLimits()
        public
        view
        returns (uint128 minBet, uint128 maxBet)
    {
        (int256 usdcPrice, ) = getUSDCPrice();

        // Convert USD amounts to USDC amounts
        // usdcPrice is in 8 decimals (e.g., 99990000 for $0.9999)
        // We want USDC amounts in 6 decimals

        // minBet = MIN_BET_USD / usdcPrice * 1e6 / 1e8
        minBet = uint128((MIN_BET_USD * 1e6) / uint256(usdcPrice));
        maxBet = uint128((MAX_BET_USD * 1e6) / uint256(usdcPrice));

        // Ensure reasonable bounds even if price feed has issues
        if (minBet < 1e5) minBet = 1e5; // 0.1 USDC absolute minimum
        if (maxBet > 1000e6) maxBet = 1000e6; // 1000 USDC absolute maximum
    }

    /**
     * @dev Get default bet amount in USDC for UI
     * @return defaultBet Default bet amount (6 decimals)
     */
    function getDefaultBetAmount() public view returns (uint128 defaultBet) {
        (int256 usdcPrice, ) = getUSDCPrice();
        defaultBet = uint128((DEFAULT_BET_USD * 1e6) / uint256(usdcPrice));

        // Ensure default is within limits
        (uint128 minBet, uint128 maxBet) = getBetLimits();
        if (defaultBet < minBet) defaultBet = minBet;
        if (defaultBet > maxBet) defaultBet = maxBet;
    }
    
    /**
     * @dev Get creator stake limits in USDC
     * @return minStake Minimum creator stake (6 decimals)
     * @return maxStake Maximum creator stake (6 decimals)
     */
    function getCreatorStakeLimits() public view returns (uint128 minStake, uint128 maxStake) {
        (int256 usdcPrice, ) = getUSDCPrice();
        
        minStake = uint128((MIN_CREATOR_STAKE_USD * 1e6) / uint256(usdcPrice));
        maxStake = uint128((MAX_CREATOR_STAKE_USD * 1e6) / uint256(usdcPrice));
        
        // Ensure reasonable bounds
        if (minStake < 5e6) minStake = 5e6; // 5 USDC absolute minimum
        if (maxStake > 10000e6) maxStake = 10000e6; // 10,000 USDC absolute maximum
    }

    /**
     * @dev Convert USDC amount to USD value for display
     * @param _usdcAmount Amount in USDC (6 decimals)
     * @return usdValue Value in USD (8 decimals)
     */
    function convertUSDCToUSD(
        uint128 _usdcAmount
    ) public view returns (uint256 usdValue) {
        (int256 usdcPrice, ) = getUSDCPrice();
        // usdValue = _usdcAmount * usdcPrice / 1e6 * 1e8
        usdValue = (uint256(_usdcAmount) * uint256(usdcPrice)) / 1e6;
    }

    /**
     * @dev Get markets for browsing UI (like your mockup)
     * @param _type Filter by prediction type (optional)
     * @param _limit Max results
     */
    function getActiveMarkets(
        PredictionType _type,
        uint32 _limit
    ) external view returns (Market[] memory) {
        uint32[] storage marketIds = _type == PredictionType.VIRAL_CAST
            ? marketsByType[_type]
            : activeMarkets;

        uint32 length = uint32(marketIds.length);
        if (_limit > 0 && _limit < length) length = _limit;

        Market[] memory result = new Market[](length);
        uint32 count = 0;

        for (uint32 i = 0; i < marketIds.length && count < length; i++) {
            uint32 marketId = marketIds[i];
            if (markets[marketId].status == MarketStatus.ACTIVE) {
                result[count] = markets[marketId];
                count++;
            }
        }

        // Resize array to actual count
        assembly {
            mstore(result, count)
        }

        return result;
    }

    /**
     * @dev Get user's betting history (for Profile tab)
     */
    function getUserBets(
        address _user,
        uint32 _limit
    ) external view returns (Bet[] memory) {
        uint32[] storage betIds = userBets[_user];
        uint32 length = uint32(betIds.length);
        if (_limit > 0 && _limit < length) length = _limit;

        Bet[] memory result = new Bet[](length);

        // Return most recent bets first
        for (uint32 i = 0; i < length; i++) {
            uint32 index = uint32(betIds.length) - 1 - i;
            result[i] = bets[betIds[index]];
        }

        return result;
    }

    /**
     * @dev Get market details with current odds and creator info
     */
    function getMarketWithOdds(
        uint32 _marketId
    )
        external
        view
        returns (Market memory market, uint256 yesOdds, uint256 noOdds, uint256 creatorStakeUSD)
    {
        market = markets[_marketId];

        if (market.yesPool + market.noPool > 0) {
            // Calculate implied probability and odds
            uint256 totalPool = market.yesPool + market.noPool;
            yesOdds = (totalPool * 100) / market.yesPool; // 2.5x = 250
            noOdds = (totalPool * 100) / market.noPool;
        } else {
            yesOdds = 200; // 2.0x default
            noOdds = 200;
        }
        
        // Convert creator stake to USD for display
        creatorStakeUSD = convertUSDCToUSD(market.creatorStake);
    }

    /**
     * @dev Get user stats for Profile UI
     */
    function getUserStats(
        address _user
    ) external view returns (UserStats memory) {
        return userStats[_user];
    }

    // ============ INTERNAL FUNCTIONS ============

    function _calculatePayout(uint32 _betId) internal view returns (uint128) {
        Bet storage bet = bets[_betId];
        Market storage market = markets[bet.marketId];

        // Determine if bet won based on stored outcome
        if (market.status == MarketStatus.CANCELLED) {
            return bet.amount; // Full refund for cancelled markets
        }
        
        if (market.status != MarketStatus.SETTLED) {
            return 0; // Market not yet settled
        }

        // Check if this bet won
        bool betWon = (bet.outcome == market.outcome);
        if (!betWon) {
            return 0; // Losing bet gets nothing
        }

        uint128 totalPool = market.yesPool + market.noPool;
        uint128 winningPool = bet.outcome ? market.yesPool : market.noPool;
        uint128 losingPool = totalPool - winningPool;

        // Calculate payout after house edge
        uint128 houseEdge = uint128((uint256(losingPool) * HOUSE_EDGE) / 10000);
        uint128 payoutPool = losingPool - houseEdge;

        if (winningPool == 0) return bet.amount;

        return
            bet.amount +
            uint128(
                (uint256(bet.amount) * uint256(payoutPool)) /
                    uint256(winningPool)
            );
    }

    function _removeFromActiveMarkets(uint32 _marketId) internal {
        for (uint32 i = 0; i < activeMarkets.length; i++) {
            if (activeMarkets[i] == _marketId) {
                activeMarkets[i] = activeMarkets[activeMarkets.length - 1];
                activeMarkets.pop();
                break;
            }
        }
    }

    // ============ ADMIN FUNCTIONS ============

    function addOracle(address _oracle) external onlyOwner {
        oracles[_oracle] = true;
    }

    function removeOracle(address _oracle) external onlyOwner {
        oracles[_oracle] = false;
    }

    function withdrawHouseFees() external onlyOwner {
        uint128 amount = houseTreasury;
        houseTreasury = 0;
        USDC.safeTransfer(owner(), amount);
    }
    
    /**
     * @dev Creator withdraws their stake after market settlement
     * @param _marketId Market to withdraw stake from
     */
    function withdrawCreatorStake(uint32 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.creator == msg.sender, "Not market creator");
        require(market.status == MarketStatus.SETTLED, "Market not settled");
        require(market.creatorStake > 0, "No stake to withdraw");
        
        uint128 stakeAmount = market.creatorStake;
        market.creatorStake = 0;
        
        USDC.safeTransfer(msg.sender, stakeAmount);
        emit CreatorStakeWithdrawn(msg.sender, stakeAmount);
    }
    
    /**
     * @dev Creator claims volume-based reward
     * @param _marketId Market to claim reward from
     */
    function claimCreatorReward(uint32 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.creator == msg.sender, "Not market creator");
        require(market.status == MarketStatus.SETTLED, "Market not settled");
        require(!market.creatorRewarded, "Already rewarded");
        require(creatorRewards[msg.sender] > 0, "No rewards available");
        
        uint128 rewardAmount = creatorRewards[msg.sender];
        market.creatorRewarded = true;
        creatorRewards[msg.sender] = 0;
        
        USDC.safeTransfer(msg.sender, rewardAmount);
        emit CreatorRewardClaimed(msg.sender, _marketId, rewardAmount);
    }
    
    /**
     * @dev Get creator's total staked amount and pending rewards
     * @param _creator Creator address
     * @return totalStaked Total amount currently staked
     * @return pendingRewards Total pending rewards to claim
     */
    function getCreatorInfo(address _creator) external view returns (uint128 totalStaked, uint128 pendingRewards) {
        totalStaked = creatorStakes[_creator];
        pendingRewards = creatorRewards[_creator];
    }

    // Emergency functions
    function pause() external onlyOwner {
        // Add pausable functionality if needed
    }
}
