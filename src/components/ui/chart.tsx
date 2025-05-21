
import React from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

// Common colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface ChartProps {
  data: any[];
  categories?: string[];
  index?: string;
  className?: string;
  valueFormatter?: (value: number) => string;
}

export const BarChart = ({
  data,
  categories = ['value'],
  index = 'name',
  className,
  valueFormatter = (value) => `${value}`,
}: ChartProps) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={index} angle={-45} textAnchor="end" height={70} />
          <YAxis tickFormatter={valueFormatter} />
          <Tooltip formatter={valueFormatter} />
          <Legend />
          {categories.map((category, index) => (
            <Bar key={category} dataKey={category} fill={COLORS[index % COLORS.length]} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const LineChart = ({
  data,
  categories = ['value'],
  index = 'name',
  className,
  valueFormatter = (value) => `${value}`,
}: ChartProps) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={index} angle={-45} textAnchor="end" height={70} />
          <YAxis tickFormatter={valueFormatter} />
          <Tooltip formatter={valueFormatter} />
          <Legend />
          {categories.map((category, index) => (
            <Line 
              key={category} 
              type="monotone" 
              dataKey={category} 
              stroke={COLORS[index % COLORS.length]} 
              activeDot={{ r: 8 }} 
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PieChart = ({
  data,
  className,
  valueFormatter = (value) => `${value}`,
}: ChartProps) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={valueFormatter} />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};
