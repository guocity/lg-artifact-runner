// @ts-nocheck
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import csvData from './flushing_exempt.csv?raw';
import _ from 'lodash';

const NonprofitDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const COLORS = [
    '#4C51BF', '#38A169', '#ED8936', '#DD6B20', '#9F7AEA',
    '#48BB78', '#F6AD55', '#81E6D9', '#68D391', '#D69E2E'
  ];

  useEffect(() => {
    const parseCSV = () => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          const parsedData = results.data;
          setData(parsedData);
          calculateStats(parsedData);
          setLoading(false);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setLoading(false);
        }
      });
    };

    parseCSV();
  }, []);

  const calculateStats = (parsedData) => {
    const totalOrgs = parsedData.length;
    const categoryGroups = _.groupBy(parsedData, 'ntee_category');
    
    const categoryIncomeData = Object.entries(categoryGroups).map(([category, orgs]) => {
      const totalIncome = _.sumBy(orgs, org => {
        const incomeAmt = parseFloat(org.INCOME_AMT);
        return isNaN(incomeAmt) ? 0 : incomeAmt;
      });
      return { 
        name: category || 'Unknown', 
        value: totalIncome,
        count: orgs.length 
      };
    });

    const sortedCategoryData = _.sortBy(categoryIncomeData, item => -item.value)
      .filter(item => item.name && item.name !== 'Unknown');
    
    setStats({
      totalOrgs,
      categoryIncomeData: sortedCategoryData
    });
  };

  const filteredData = data.filter(org => {
    const matchesCategory = selectedCategory ? org.ntee_category === selectedCategory : true;
    const matchesSearch = searchTerm ? 
      (org.NAME?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
       org.EIN?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
       org.ICO?.toString().toLowerCase().includes(searchTerm.toLowerCase())) : true;
    
    return matchesCategory && matchesSearch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleCategoryClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const category = data.activePayload[0].payload.name;
      const newCategory = selectedCategory === category ? null : category;
      setSelectedCategory(newCategory);
      setShowTable(newCategory !== null);
      setCurrentPage(1);
    } else {
      setSelectedCategory(null);
      setShowTable(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const renderChart = () => (
    <div className="p-6 bg-white rounded-lg shadow-lg" style={{ minWidth: '800px' }}>
      <h3 className="text-xl font-semibold mb-4">Total Income by Category</h3>
      {selectedCategory && (
        <button 
          onClick={() => {
            setSelectedCategory(null);
            setShowTable(false);
          }}
          className="mb-4 px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
        >
          Clear Filter: {selectedCategory}
        </button>
      )}
      <p className="text-gray-600 mb-4">Click a bar to filter and view details</p>
      <ResponsiveContainer width="100%" height={500}>
        <BarChart 
          data={stats.categoryIncomeData} 
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 20, bottom: 150 }}
          onClick={handleCategoryClick}
          cursor="pointer"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="category" 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={140}
            interval={0}
            tick={{ fontSize: 10, fill: '#333' }}
          />
          <YAxis 
            type="number"
            tickFormatter={(value) => new Intl.NumberFormat('en-US', {
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value)}
          />
          <Tooltip 
            formatter={(value) => [formatCurrency(value), "Total Income"]} 
            labelFormatter={(name) => `Category: ${name}`}
          />
          <Legend />
          <Bar 
            dataKey="value" 
            name="Total Income" 
            fill="#4C51BF"
          >
            {stats.categoryIncomeData?.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={selectedCategory === entry.name ? '#DD6B20' : COLORS[index % COLORS.length]} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderTable = () => (
    <div className="mt-6 p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by Name, EIN, or ICO..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EIN</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ICO</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assets</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentItems.map((org, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{org.NAME}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.EIN}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.ICO}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.ntee_category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.TAX_PERIOD}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(org.ASSET_AMT)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(org.INCOME_AMT)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(org.REVENUE_AMT)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
          <span className="font-medium">{Math.min(indexOfLastItem, filteredData.length)}</span> of{" "}
          <span className="font-medium">{filteredData.length}</span> results
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 border rounded-md ${currentPage === 1 ? 'bg-gray-200 text-gray-500' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {currentPage} of {totalPages || 1}</span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-4 py-2 border rounded-md ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-200 text-gray-500' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto p-4 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">Nonprofit Organizations Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Analysis of {stats.totalOrgs || 0} nonprofit organizations
            {selectedCategory && <span className="font-medium text-indigo-600"> | Filtered by: {selectedCategory}</span>}
          </p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-xl font-semibold">Loading data...</p>
              <p className="text-gray-500">Please wait while we process the CSV file.</p>
            </div>
          </div>
        ) : (
          <>
            {renderChart()}
            {showTable && renderTable()}
          </>
        )}
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-500">
          Nonprofit Organizations Analysis Dashboard © 2025
        </div>
      </footer>
    </div>
  );
};

export default NonprofitDashboard;