import React, { useState } from 'react';
import Link from 'next/link';
import { BettingGroup } from '~/lib/socialBetting';
import { useBettingGroups } from '~/hooks/useBettingGroups';

interface BettingGroupsProps {
  userFid: number;
  className?: string;
}

export function BettingGroups({ userFid, className = '' }: BettingGroupsProps) {
  const [activeTab, setActiveTab] = useState<'my-groups' | 'discover' | 'create'>('my-groups');

  // Fetch user's groups
  const { 
    groups: userGroups, 
    loading: userGroupsLoading, 
    error: userGroupsError, 
    refresh: refreshUserGroups 
  } = useBettingGroups({ userFid, type: 'my-groups' });

  // Fetch discoverable groups
  const { 
    groups: discoverGroups, 
    loading: discoverGroupsLoading, 
    error: discoverGroupsError, 
    joinGroup 
  } = useBettingGroups({ userFid, type: 'discover' });

  const currentLoading = activeTab === 'my-groups' ? userGroupsLoading : discoverGroupsLoading;
  const currentError = activeTab === 'my-groups' ? userGroupsError : discoverGroupsError;

  if (currentLoading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 w-24 bg-muted rounded-lg"></div>
            ))}
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-xl p-6 border border-border">
              <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-muted rounded w-2/3 mb-3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'my-groups', label: 'My Groups', icon: '👥' },
          { id: 'discover', label: 'Discover', icon: '🔍' },
          { id: 'create', label: 'Create Group', icon: '➕' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {currentError && (
        <div className="text-center py-8">
          <div className="text-red-500 text-sm mb-4">{currentError}</div>
          <button 
            onClick={() => activeTab === 'my-groups' ? refreshUserGroups() : undefined}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Tab Content */}
      {!currentError && activeTab === 'my-groups' && (
        <MyGroupsTab groups={userGroups} userFid={userFid} />
      )}
      {!currentError && activeTab === 'discover' && (
        <DiscoverGroupsTab 
          groups={discoverGroups} 
          userFid={userFid} 
          onJoinGroup={joinGroup}
        />
      )}
      {!currentError && activeTab === 'create' && (
        <CreateGroupTab userFid={userFid} onGroupCreated={refreshUserGroups} />
      )}
    </div>
  );
}

// My Groups Tab
function MyGroupsTab({ groups, userFid }: { groups: BettingGroup[]; userFid: number }) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">👥</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Groups Yet</h3>
        <p className="text-muted-foreground mb-6">Join or create a betting group to connect with other predictors</p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={() => window.location.href = '#discover'}
            className="btn btn-primary"
          >
            Discover Groups
          </button>
          <button 
            onClick={() => window.location.href = '#create'}
            className="btn btn-outline"
          >
            Create Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} userFid={userFid} />
      ))}
    </div>
  );
}

// Discover Groups Tab
function DiscoverGroupsTab({ 
  groups, 
  userFid, 
  onJoinGroup 
}: { 
  groups: BettingGroup[]; 
  userFid: number;
  onJoinGroup: (groupId: string) => Promise<boolean>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);

  const allTags = Array.from(new Set(groups.flatMap(g => g.tags)));
  
  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => group.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const handleJoinGroup = async (groupId: string) => {
    setJoiningGroup(groupId);
    try {
      const success = await onJoinGroup(groupId);
      
      if (success) {
        alert('Successfully joined the group!');
      } else {
        alert('Failed to join the group. Please try again.');
      }
    } catch (error) {
      alert('Error joining group. Please try again.');
    } finally {
      setJoiningGroup(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input w-full"
        />
        
        {/* Tag Filters */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground py-2">Tags:</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setSelectedTags(prev => 
                  prev.includes(tag) 
                    ? prev.filter(t => t !== tag)
                    : [...prev, tag]
                );
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {filteredGroups.map((group) => (
          <div key={group.id} className="bg-card rounded-xl p-6 border border-border hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold">
                  {group.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{group.name}</h3>
                  <p className="text-muted-foreground text-sm">{group.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleJoinGroup(group.id)}
                disabled={joiningGroup === group.id}
                className="btn btn-primary"
              >
                {joiningGroup === group.id ? 'Joining...' : 'Join Group'}
              </button>
            </div>

            {/* Group Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{group.totalMembers}</div>
                <div className="text-xs text-muted-foreground">Members</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">${group.totalVolume.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Volume</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {group.minStake ? `$${group.minStake}` : 'Free'}
                </div>
                <div className="text-xs text-muted-foreground">Min Stake</div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex gap-2 flex-wrap mb-4">
              {group.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Rules Preview */}
            {group.rules && (
              <div className="text-sm text-muted-foreground">
                <strong>Rules:</strong> {group.rules.slice(0, 100)}
                {group.rules.length > 100 && '...'}
              </div>
            )}
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">No groups found matching your criteria</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Create Group Tab
function CreateGroupTab({ 
  userFid, 
  onGroupCreated 
}: { 
  userFid: number;
  onGroupCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    minStake: '',
    rules: '',
    tags: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/betting-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid,
          name: formData.name,
          description: formData.description,
          isPublic: formData.isPublic,
          minStake: formData.minStake || undefined,
          rules: formData.rules || undefined,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Group created successfully!');
        // Reset form
        setFormData({
          name: '',
          description: '',
          isPublic: true,
          minStake: '',
          rules: '',
          tags: ''
        });
        // Refresh user groups
        onGroupCreated();
      } else {
        setError(result.error || 'Failed to create group');
      }
    } catch (error) {
      setError('Failed to create group. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-xl p-6 border border-border">
        <h2 className="text-xl font-bold text-foreground mb-6">Create New Betting Group</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input w-full"
              placeholder="Enter group name"
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input w-full min-h-[100px] resize-vertical"
              placeholder="Describe what your group is about..."
              required
              minLength={10}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Group Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="groupType"
                  checked={formData.isPublic}
                  onChange={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                  className="text-primary"
                />
                <span>Public (anyone can join)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="groupType"
                  checked={!formData.isPublic}
                  onChange={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                  className="text-primary"
                />
                <span>Private (invite only)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Minimum Stake (USDC)
            </label>
            <input
              type="number"
              value={formData.minStake}
              onChange={(e) => setFormData(prev => ({ ...prev, minStake: e.target.value }))}
              className="input w-full"
              placeholder="Optional minimum bet amount"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty for no minimum requirement
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="input w-full"
              placeholder="viral, content, beginner (comma separated)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Group Rules
            </label>
            <textarea
              value={formData.rules}
              onChange={(e) => setFormData(prev => ({ ...prev, rules: e.target.value }))}
              className="input w-full min-h-[100px] resize-vertical"
              placeholder="Optional rules and guidelines for group members..."
              maxLength={500}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.description}
              className="btn btn-primary flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setFormData({
                  name: '',
                  description: '',
                  isPublic: true,
                  minStake: '',
                  rules: '',
                  tags: ''
                });
                setError(null);
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Group Card Component
function GroupCard({ group, userFid }: { group: BettingGroup; userFid: number }) {
  const userMember = group.members.find(m => m.fid === userFid);
  const isAdmin = userMember?.role === 'admin';

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold">
            {group.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{group.name}</h3>
            <p className="text-muted-foreground text-sm">{group.description}</p>
          </div>
        </div>
        {isAdmin && (
          <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
            Admin
          </span>
        )}
      </div>

      {/* Group Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">{group.totalMembers}</div>
          <div className="text-xs text-muted-foreground">Members</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">${group.totalVolume.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Volume</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {userMember?.totalBets || 0}
          </div>
          <div className="text-xs text-muted-foreground">Your Bets</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-500">
            ${userMember?.totalWinnings.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-muted-foreground">Your Winnings</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/groups/${group.id}`}
          className="btn btn-primary flex-1"
        >
          View Group
        </Link>
        <button className="btn btn-outline">
          Share Invite
        </button>
        {isAdmin && (
          <button className="btn btn-outline">
            Manage
          </button>
        )}
      </div>
    </div>
  );
}