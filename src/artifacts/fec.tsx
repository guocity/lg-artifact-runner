import { useState, useEffect } from 'react'; // Keep this as it's required for JSX
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import Papa from 'papaparse';
import _ from 'lodash';
import csvData from './schedule_a-2025-03-11T18_14_18.csv?raw';

// Interfaces remain the same
interface FECRecord {
  contribution_receipt_date?: string;
  contribution_receipt_amount?: number;
  committee_name?: string;
  contributor_state?: string;
}

interface StateContribution {
  state: string;
  count: number;
}

interface CommitteeContribution {
  name: string;
  fullName: string;
  count: number;
}

interface ContributionRange {
  range: string;
  count: number;
}

interface SummaryStats {
  totalRecords: number;
  totalAmount: number;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
}

interface TimeSeriesEntry {
  date: string;
  [key: string]: number | string;
}

const FECDataAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateContributions, setStateContributions] = useState<StateContribution[]>([]);
  const [topCommittees, setTopCommittees] = useState<CommitteeContribution[]>([]);
  const [contributionRanges, setContributionRanges] = useState<ContributionRange[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalRecords: 0,
    totalAmount: 0,
    avgAmount: 0,
    minAmount: 0,
    maxAmount: 0
  });
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesEntry[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('all');

  useEffect(() => {
    const parseData = () => {
      try {
        Papa.parse<FECRecord>(csvData, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data;
            processData(parsedData);
            setLoading(false);
          },
          error: (error: Error) => {
            setError(`Error parsing CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (error) {
        setError(`Error processing CSV: ${(error as Error).message}`);
        setLoading(false);
      }
    };

    parseData();
  }, []);

  const processTimeSeriesData = (rawData: FECRecord[]) => {
    const contributionsByDate: { date: string; committee: string; amount: number }[] = [];
    
    rawData.forEach(record => {
      if (record.contribution_receipt_date && record.contribution_receipt_amount && record.committee_name) {
        const date = new Date(record.contribution_receipt_date);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        contributionsByDate.push({
          date: yearMonth,
          committee: record.committee_name,
          amount: record.contribution_receipt_amount
        });
      }
    });
    
    const committeeAmounts: { [key: string]: number } = {};
    contributionsByDate.forEach(item => {
      committeeAmounts[item.committee] = (committeeAmounts[item.committee] || 0) + item.amount;
    });
    
    const topCommitteesByAmount = Object.entries(committeeAmounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
      
    const groupedData = _.groupBy(contributionsByDate, 'date');
    
    const chartData = Object.entries(groupedData).map(([date, contributions]) => {
      const entry: TimeSeriesEntry = { date };
      
      topCommitteesByAmount.forEach(committee => {
        const shortName = committee.length > 15 ? committee.substring(0, 12) + '...' : committee;
        entry[shortName] = 0; // Initialize as number
        entry[`${shortName}_fullName`] = committee;
      });
      
      entry['Others'] = 0; // Initialize as number
      
      contributions.forEach(contribution => {
        const committee = contribution.committee;
        const amount = contribution.amount;
        
        if (topCommitteesByAmount.includes(committee)) {
          const shortName = committee.length > 15 ? committee.substring(0, 12) + '...' : committee;
          entry[shortName] = (entry[shortName] as number) + amount; // Type assertion to number
        } else {
          entry['Others'] = (entry['Others'] as number) + amount; // Type assertion to number
        }
      });
      
      return entry;
    });
    
    chartData.sort((a, b) => a.date.localeCompare(b.date));
    
    setTimeSeriesData(chartData);
  };

  const processData = (rawData: FECRecord[]) => {
    const validContributions = rawData.filter(record => record.contribution_receipt_amount);
    const totalAmount = validContributions.reduce((sum, record) => sum + (record.contribution_receipt_amount || 0), 0);
    const avgAmount = totalAmount / validContributions.length;
    const minAmount = Math.min(...validContributions.map(record => record.contribution_receipt_amount || 0));
    const maxAmount = Math.max(...validContributions.map(record => record.contribution_receipt_amount || 0));
    
    setSummaryStats({
      totalRecords: rawData.length,
      totalAmount,
      avgAmount,
      minAmount,
      maxAmount
    });
    
    const stateData: { [key: string]: number } = {};
    rawData.forEach(record => {
      if (record.contributor_state) {
        stateData[record.contributor_state] = (stateData[record.contributor_state] || 0) + 1;
      }
    });
    
    const stateArray = Object.entries(stateData)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
    
    setStateContributions(stateArray);
    
    const committeeData: { [key: string]: number } = {};
    rawData.forEach(record => {
      if (record.committee_name) {
        committeeData[record.committee_name] = (committeeData[record.committee_name] || 0) + 1;
      }
    });
    
    const committeeArray = Object.entries(committeeData)
      .map(([name, count]) => ({
        name: name.length > 25 ? name.substring(0, 22) + '...' : name,
        fullName: name,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    setTopCommittees(committeeArray);
    
    const ranges: { [key: string]: number } = {
      "Under $100": 0,
      "$100 - $499": 0,
      "$500 - $999": 0,
      "$1000 - $2799": 0,
      "$2800+": 0
    };
    
    validContributions.forEach(record => {
      const amount = record.contribution_receipt_amount || 0;
      if (amount < 100) ranges["Under $100"]++;
      else if (amount < 500) ranges["$100 - $499"]++;
      else if (amount < 1000) ranges["$500 - $999"]++;
      else if (amount < 2800) ranges["$1000 - $2799"]++;
      else ranges["$2800+"]++;
    });
    
    const rangesArray = Object.entries(ranges).map(([range, count]) => ({
      range,
      count
    }));
    
    setContributionRanges(rangesArray);
    
    processTimeSeriesData(rawData);
  };

  const getFilteredTimeSeriesData = () => {
    if (yearFilter === 'all') {
      return timeSeriesData;
    }
    return timeSeriesData.filter(item => item.date.startsWith(yearFilter));
  };

  const getYears = () => {
    const years = new Set<string>();
    timeSeriesData.forEach(item => {
      years.add(item.date.split('-')[0]);
    });
    return ['all', ...Array.from(years).sort()];
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57'];

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading data...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">FEC Campaign Finance Data Analysis</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Summary Statistics</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Total Records:</span> {summaryStats.totalRecords}</p>
            <p><span className="font-medium">Total Contributions:</span> ${summaryStats.totalAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
            <p><span className="font-medium">Average Contribution:</span> ${summaryStats.avgAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
            <p><span className="font-medium">Minimum Contribution:</span> ${summaryStats.minAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
            <p><span className="font-medium">Maximum Contribution:</span> ${summaryStats.maxAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Contribution Amount Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contributionRanges}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ range, count }) => `${range}: ${count}`}
                >
                  {contributionRanges.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, _, props) => [`${value} contributions`, props.payload.range]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Top 10 Committees Receiving Contributions</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topCommittees}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip formatter={(value) => [`${value} contributions`]} labelFormatter={(label) => {
                const item = topCommittees.find(c => c.name === label);
                return item ? item.fullName : label;
              }} />
              <Bar dataKey="count" fill="#8884d8">
                {topCommittees.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded shadow mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Contributions Over Time by Committee</h2>
          <div>
            <label htmlFor="yearFilter" className="mr-2">Filter by year:</label>
            <select 
              id="yearFilter"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="border rounded p-1"
            >
              {getYears().map(year => (
                <option key={year} value={year}>{year === 'all' ? 'All Years' : year}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={getFilteredTimeSeriesData()}
              margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45} 
                textAnchor="end" 
                height={70}
                interval="preserveStartEnd"
              />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`]} />
              <Legend />
              {Object.keys(timeSeriesData[0] || {})
                .filter(key => !key.includes('fullName') && key !== 'date')
                .map((committee, index) => (
                  <Area 
                    key={committee}
                    type="monotone" 
                    dataKey={committee}
                    stackId="1"
                    fill={COLORS[index % COLORS.length]} 
                    stroke={COLORS[index % COLORS.length]}
                    name={committee}
                  />
                ))
              }
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Contributions by State</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stateContributions}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="state" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} contributions`]} />
              <Bar dataKey="count" fill="#8884d8">
                {stateContributions.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FECDataAnalysis;