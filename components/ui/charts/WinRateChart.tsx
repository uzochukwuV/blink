'use client';

import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface WinRateChartProps {
  winRate: number;
  className?: string;
}

export function WinRateChart({ winRate, className = "" }: WinRateChartProps) {
  const data = {
    labels: ['Wins', 'Losses'],
    datasets: [
      {
        data: [winRate, 100 - winRate],
        backgroundColor: [
          '#10b981',
          '#ef4444'
        ],
        borderColor: [
          '#059669',
          '#dc2626'
        ],
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#6b7280',
          font: {
            size: 12
          },
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f9fafb',
        bodyColor: '#f9fafb',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.parsed.toFixed(1)}%`;
          }
        }
      }
    },
    cutout: '60%'
  };

  return (
    <div className={`${className} relative`} style={{ height: '200px' }}>
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{winRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-400">Win Rate</div>
        </div>
      </div>
    </div>
  );
}