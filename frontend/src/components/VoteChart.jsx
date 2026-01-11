import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const VoteChart = ({ voteStats, isLoading, className = '' }) => {
  const { gpt_4o, claude, total, percentages } = voteStats;

  // Prepare data for the chart
  const chartData = [
    {
      name: 'GPT-4o',
      votes: gpt_4o,
      percentage: percentages.gpt_4o,
      color: '#10b981' // Emerald green
    },
    {
      name: 'Claude',
      votes: claude,
      percentage: percentages.claude,
      color: '#8b5cf6' // Purple
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold">{`${label}`}</p>
          <p className="text-blue-400">{`Votes: ${data.votes}`}</p>
          <p className="text-green-400">{`Percentage: ${data.percentage}%`}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={`vote-chart-container ${className}`}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="text-gray-300 mt-2">Loading vote data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`vote-chart-container ${className}`}>
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">Live Vote Results</h3>
        <p className="text-sm text-gray-300">
          Total Votes: <span className="font-bold text-blue-400">{total}</span>
        </p>
      </div>

      {total === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No votes yet! Be the first to vote.</p>
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="mb-6" style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="votes" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Percentage Bars */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">GPT-4o</span>
              <span className="text-sm text-gray-300">{gpt_4o} votes ({percentages.gpt_4o}%)</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${percentages.gpt_4o}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Claude</span>
              <span className="text-sm text-gray-300">{claude} votes ({percentages.claude}%)</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${percentages.claude}%` }}
              ></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VoteChart; 