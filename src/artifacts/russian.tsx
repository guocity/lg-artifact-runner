// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import ReactSlider from 'react-slider';
import csvData from './result_df.csv?raw';
import '../PropertyDataDashboard.css'; // Make sure to keep this for your existing styles

const MUNICIPALITY_MAP = {
  201: 'Allendale',
  202: 'Alpine',
  203: 'Bergenfield',
  204: 'Bogota',
  205: 'Carlstadt',
  206: 'Cliffside Park',
  207: 'Closter',
  208: 'Cresskill',
  209: 'Demarest',
  210: 'Dumont',
  211: 'Elmwood Park',
  212: 'East Rutherford',
  213: 'Edgewater',
  214: 'Emerson',
  215: 'Englewood',
  216: 'Englewood Cliffs',
  217: 'Fair Lawn',
  218: 'Fairview',
  219: 'Fort Lee',
  220: 'Franklin Lakes',
  221: 'Garfield',
  222: 'Glen Rock',
  223: 'Hackensack',
  224: 'Harrington Park',
  225: 'Hasbrouck Heights',
  226: 'Haworth',
  227: 'Hillsdale',
  228: 'Ho Ho Kus',
  229: 'Leonia',
  230: 'Little Ferry',
  231: 'Lodi',
  232: 'Lyndhurst',
  233: 'Mahwah',
  234: 'Maywood',
  235: 'Midland Park',
  236: 'Montvale',
  237: 'Moonachie',
  238: 'New Milford',
  239: 'North Arlington',
  240: 'Northvale',
  241: 'Norwood',
  242: 'Oakland',
  243: 'Old Tappan',
  244: 'Oradell',
  245: 'Palisades Park',
  246: 'Paramus',
  247: 'Park Ridge',
  248: 'Ramsey',
  249: 'Ridgefield',
  250: 'Ridgefield Park Village',
  251: 'Ridgewood Village',
  252: 'River Edge',
  253: 'River Vale',
  254: 'Rochelle Park',
  255: 'Rockleigh',
  256: 'Rutherford',
  257: 'Saddle Brook',
  258: 'Saddle River',
  259: 'South Hackensack',
  260: 'Teaneck',
  261: 'Tenafly',
  262: 'Teterboro',
  263: 'Upper Saddle River',
  264: 'Waldwick',
  265: 'Wallington',
  266: 'Washington',
  267: 'Westwood',
  268: 'Woodcliff Lake',
  269: 'Wood Ridge',
  270: 'Wyckoff'
};

const PropertyDataDashboard = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [municipalities, setMunicipalities] = useState([]);
  const [selectedMunicipalities, setSelectedMunicipalities] = useState([]);
  const [yearRange, setYearRange] = useState([0, 3000]);
  const [dateRange, setDateRange] = useState([0, 0]);
  const [salePriceRange, setSalePriceRange] = useState([0, 0]);
  const [taxes1Range, setTaxes1Range] = useState([0, 0]);
  const [yearBounds, setYearBounds] = useState([0, 3000]);
  const [dateBounds, setDateBounds] = useState([0, 0]);
  const [salePriceBounds, setSalePriceBounds] = useState([0, 0]);
  const [taxes1Bounds, setTaxes1Bounds] = useState([0, 0]);
  const [selectedRow, setSelectedRow] = useState(null);
  const tableRef = useRef(null);
  const modalRef = useRef(null);
  const ITEMS_PER_PAGE = 50;
  const [isCopying, setIsCopying] = useState(false);

  const [summaries, setSummaries] = useState({
    salePrice: 0,
    acreage: 0,
    totalAssmnt: 0,
    taxes1: 0
  });
// @ts-nocheck
  const processData = useCallback((parsedData) => {
    // @ts-nocheck
    const cleanedData = parsedData.map(row => {
      let saleDate = null;
      if (row['Sale Date'] && row['Sale Date'] !== '0000-00-00') {
        try {
          saleDate = new Date(row['Sale Date']);
          if (isNaN(saleDate.getTime())) saleDate = null;
        } catch (e) {
          saleDate = null;
        }
      }

      const municipalityCode = parseInt(row['Municipality']);
      const municipalityName = MUNICIPALITY_MAP.hasOwnProperty(municipalityCode)
      // @ts-nocheck
        ? MUNICIPALITY_MAP?.[municipalityCode]
        : row['Municipality'];

      const salePrice = parseFloat(row['Sale Price'] || 0);
      const taxes1 = parseFloat(row['Taxes 1'] || 0);

      return {
        ...row,
        'Municipality': municipalityName,
        'Sale Price': salePrice,
        'Acreage': parseFloat(row['Acreage'] || 0),
        'Total Assmnt': parseFloat(row['Total Assmnt'] || 0),
        'Taxes 1': taxes1,
        'Yr. Built': parseInt(row['Yr. Built'] || 0),
        'Sale Date': saleDate
      };
    });

    setData(cleanedData);
    setFilteredData(cleanedData);
    setDisplayedData(cleanedData.slice(0, ITEMS_PER_PAGE));
// @ts-nocheck
    const uniqueMunicipalities = _.uniq(cleanedData.map(row => row['Municipality'])).filter(Boolean).sort();
    // @ts-nocheck
    setMunicipalities(uniqueMunicipalities);
// @ts-nocheck
    const years = cleanedData.map(row => row['Yr. Built']).filter(year => year > 0);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    setYearBounds([minYear, maxYear]);
    setYearRange([minYear, maxYear]);
// @ts-nocheck
    const validDates = cleanedData.map(row => row['Sale Date'])
    // @ts-nocheck
      .filter(date => date && !isNaN(date.getTime()))
      // @ts-nocheck
      .map(date => date.getTime());
    if (validDates.length > 0) {
      const minDate = Math.min(...validDates);
      const maxDate = Math.max(...validDates);
      setDateBounds([minDate, maxDate]);
      setDateRange([minDate, maxDate]);
    }
// @ts-nocheck
    const prices = cleanedData.map(row => row['Sale Price']).filter(price => !isNaN(price));
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    setSalePriceBounds([minPrice, maxPrice]);
    setSalePriceRange([minPrice, maxPrice]);
// @ts-nocheck
    const allTaxes = cleanedData.map(row => row['Taxes 1']).filter(tax => !isNaN(tax));
    const minTax = allTaxes.length > 0 ? Math.min(...allTaxes) : 0;
    const maxTax = allTaxes.length > 0 ? Math.max(...allTaxes) : 0;
    setTaxes1Bounds([minTax, maxTax]);
    setTaxes1Range([minTax, maxTax]);

    calculateSummaries(cleanedData);
  }, []);

  useEffect(() => {
    Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        processData(results.data);
        setIsLoading(false);
      },
      // @ts-nocheck
      error: (err) => {
        // @ts-nocheck
        setError(`Error parsing CSV: ${err.message}`);
        setIsLoading(false);
      }
    });
  }, [processData]);

  useEffect(() => {
    const handleScroll = () => {
      if (!tableRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoading) {
        loadMoreData();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredData, page, isLoading]);
// @ts-nocheck
  const calculateSummaries = useCallback((dataToSum) => {
    setSummaries({
      salePrice: _.sumBy(dataToSum, 'Sale Price'),
      acreage: _.sumBy(dataToSum, 'Acreage'),
      totalAssmnt: _.sumBy(dataToSum, 'Total Assmnt'),
      taxes1: _.sumBy(dataToSum, 'Taxes 1')
    });
  }, []);

  const applyFilters = useCallback(() => {
    const filtered = data.filter(row => {
      const municipalityMatch = selectedMunicipalities.length === 0 || selectedMunicipalities.includes(row['Municipality']);
      const yearMatch = row['Yr. Built'] >= yearRange?.[0] && row['Yr. Built'] <= yearRange?.[1];
      // @ts-nocheck
      const dateMatch = row['Sale Date'] ? row['Sale Date'].getTime() >= dateRange?.[0] && row['Sale Date'].getTime() <= dateRange?.[1] : true;
      const priceMatch = row['Sale Price'] >= salePriceRange?.[0] && row['Sale Price'] <= salePriceRange?.[1];
      const taxesMatch = row['Taxes 1'] >= taxes1Range?.[0] && row['Taxes 1'] <= taxes1Range?.[1];

      return municipalityMatch && yearMatch && dateMatch && priceMatch && taxesMatch;
    });

    setFilteredData(filtered);
    setDisplayedData(filtered.slice(0, ITEMS_PER_PAGE));
    setPage(1);
    calculateSummaries(filtered);
  }, [data, selectedMunicipalities, yearRange, dateRange, salePriceRange, taxes1Range, calculateSummaries]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const loadMoreData = useCallback(() => {
    const nextPage = page + 1;
    const newData = filteredData.slice(0, nextPage * ITEMS_PER_PAGE);
    setDisplayedData(newData);
    setPage(nextPage);
  }, [filteredData, page]);
// @ts-nocheck
  const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
// @ts-nocheck
  const formatNumber = (value) => new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
// @ts-nocheck
  const formatDateForSlider = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };
// @ts-nocheck
  const handleRowClick = useCallback((row) => {
    setSelectedRow(row);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedRow(null);
  }, []);
// @ts-nocheck
  const handleMunicipalitySelect = useCallback((municipality) => {
    // @ts-nocheck
    setSelectedMunicipalities((prev) => {
      // @ts-nocheck
      if (prev.includes(municipality)) {
        return prev.filter((m) => m !== municipality);
      } else {
        return [...prev, municipality];
      }
    });
  }, []);

  const handleCopyTable = useCallback(async () => {
    setIsCopying(true);
    if (!tableRef.current) {
      setIsCopying(false);
      alert('Table not found.');
      return;
    }

    const table = tableRef.current;
    // @ts-nocheck
    const rows = table.querySelectorAll('tr');
    let csv = [];

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('th, td'));
      // @ts-nocheck
      const rowData = cells.map(cell => cell.innerText);
      csv.push(rowData.join(','));
    }

    try {
      await navigator.clipboard.writeText(csv.join('\n'));
      alert('Table data copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy table data to clipboard.');
    } finally {
      setIsCopying(false);
    }
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedMunicipalities([]);
    setYearRange(yearBounds);
    setDateRange(dateBounds);
    setSalePriceRange(salePriceBounds);
    setTaxes1Range(taxes1Bounds);
  }, [yearBounds, dateBounds, salePriceBounds, taxes1Bounds, setSelectedMunicipalities, setYearRange, setDateRange, setSalePriceRange, setTaxes1Range]);
// @ts-nocheck
  const handleModalClickOutside = useCallback((event) => {
    // @ts-nocheck
    if (selectedRow && modalRef.current && !modalRef.current.contains(event.target)) {
      closeModal();
    }
  }, [selectedRow, closeModal, modalRef]);

  useEffect(() => {
    document.addEventListener('mousedown', handleModalClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleModalClickOutside);
    };
  }, [handleModalClickOutside]);

  if (isLoading) return <div className="text-center p-8">Loading property data...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="sticky top-0 bg-gray-50 z-10 p-4 flex justify-end gap-2 mb-4">
        <button
          onClick={handleCopyTable}
          disabled={isCopying}
          className={`px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 ${isCopying ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isCopying ? 'Copying...' : 'Copy Table'}
        </button>
        <button
          onClick={resetFilters}
          className="px-4 py-2 rounded bg-gray-300 text-gray-700 hover:bg-gray-400"
        >
          Reset Filters
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Property Data Analysis</h1>

      {/* Filters */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Municipality</label>
            <div className="flex flex-wrap gap-2">
              {municipalities.map((municipality) => (
                <button
                  key={municipality}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedMunicipalities.includes(municipality)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  onClick={() => handleMunicipalitySelect(municipality)}
                >
                  {municipality}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Year Built Range</label>
            <ReactSlider
              className="horizontal-slider"
              thumbClassName="example-thumb"
              trackClassName="example-track"
              defaultValue={yearBounds}
              min={yearBounds?.[0]}
              max={yearBounds?.[1]}
              onChange={(value) => setYearRange(value)}
              value={yearRange}
              pearling
              minDistance={1}
            />
            <div className="flex justify-between text-sm mt-2">
              <span>{yearRange?.[0]}</span>
              <span>{yearRange?.[1]}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sale Date Range</label>
            <ReactSlider
              className="horizontal-slider"
              thumbClassName="example-thumb"
              trackClassName="example-track"
              defaultValue={dateBounds}
              min={dateBounds?.[0]}
              max={dateBounds?.[1]}
              onChange={(value) => setDateRange(value)}
              value={dateRange}
              pearling
              minDistance={86400000} // Minimum 1 day difference in milliseconds
              // @ts-nocheck
              formatValue={formatDateForSlider}
            />
            <div className="flex justify-between text-sm mt-2">
              <span>{dateBounds?.[0] ? formatDateForSlider(dateRange?.[0]) : ''}</span>
              <span>{dateBounds?.[1] ? formatDateForSlider(dateRange?.[1]) : ''}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Sale Price Range</label>
            <ReactSlider
              className="horizontal-slider"
              thumbClassName="example-thumb"
              trackClassName="example-track"
              defaultValue={salePriceBounds}
              min={salePriceBounds?.[0]}
              max={salePriceBounds?.[1]}
              onChange={(value) => setSalePriceRange(value)}
              value={salePriceRange}
              pearling
              minDistance={1000}
              // @ts-nocheck
              formatValue={formatCurrency}
            />
            <div className="flex justify-between text-sm mt-2">
              <span>{formatCurrency(salePriceRange?.[0])}</span>
              <span>{formatCurrency(salePriceRange?.[1])}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Taxes 1 Range</label>
            <ReactSlider
              className="horizontal-slider"
              thumbClassName="example-thumb"
              trackClassName="example-track"
              defaultValue={taxes1Bounds}
              min={taxes1Bounds?.[0]}
              max={taxes1Bounds?.[1]}
              onChange={(value) => setTaxes1Range(value)}
              value={taxes1Range}
              pearling
              minDistance={100}
              // @ts-nocheck
              formatValue={formatCurrency}
            />
            <div className="flex justify-between text-sm mt-2">
              <span>{formatCurrency(taxes1Range?.[0])}</span>
              <span>{formatCurrency(taxes1Range?.[1])}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800">Total Found</h3>
          <p className="text-2xl font-bold">{filteredData.length}</p>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800">Total Sale Price</h3>
          <p className="text-2xl font-bold">{formatCurrency(summaries.salePrice)}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-800">Total Acreage</h3>
          <p className="text-2xl font-bold">{formatNumber(summaries.acreage)} acres</p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-800">Total Assessment</h3>
          <p className="text-2xl font-bold">{formatCurrency(summaries.totalAssmnt)}</p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-red-800">Total Taxes 1</h3>
          <p className="text-2xl font-bold">{formatCurrency(summaries.taxes1)}</p>
        </div>
      </div>

      {/* Data Table */}
      <div ref={tableRef}>
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Municipality</th>
              <th className="p-2 border">Property Location</th>
              <th className="p-2 border">Owner's Name</th>
              <th className="p-2 border">Yr. Built</th>
              <th className="p-2 border">Sale Date</th>
              <th className="p-2 border">Sale Price</th>
              <th className="p-2 border">Acreage</th>
              <th className="p-2 border">Total Assmnt</th>
              <th className="p-2 border">Taxes 1</th>
            </tr>
          </thead>
          <tbody>
            {displayedData.map((row, index) => (
              <tr
                key={index}
                className="hover:bg-gray-100 cursor-pointer"
                onClick={() => handleRowClick(row)}
              >
                <td className="p-2 border">{row['Municipality']}</td>
                <td className="p-2 border">{row['Property Location']}</td>
                <td className="p-2 border">{row["Owner's Name"]}</td>
                <td className="p-2 border">{row['Yr. Built']}</td>
                <td className="p-2 border">
                  {row['Sale Date']?.toLocaleDateString() || ''}
                </td>
                <td className="p-2 border text-right">{formatCurrency(row['Sale Price'])}</td>
                <td className="p-2 border text-right">{formatNumber(row['Acreage'])}</td>
                <td className="p-2 border text-right">{formatCurrency(row['Total Assmnt'])}</td>
                <td className="p-2 border text-right">{formatCurrency(row['Taxes 1'])}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {displayedData.length < filteredData.length && (
          <div className="mt-2 text-sm text-gray-500">
            Showing {displayedData.length} of {filteredData.length} records
          </div>
        )}

        {displayedData.length === 0 && (
          <div className="mt-4 p-4 text-center bg-gray-50 rounded">
            No records found matching your filters.
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Property Details</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(selectedRow).map(([key, value]) => (
                <div key={key} className="border-b py-2">
                  <span className="font-medium">{key}: </span>
                  <span>
                    {key === 'Sale Date' && value instanceof Date
                      ? value.toLocaleDateString()
                      : key === 'Sale Price' || key === 'Total Assmnt' || key === 'Taxes 1'
                      ? formatCurrency(value)
                      : key === 'Acreage'
                      ? formatNumber(value)
                      : value}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={closeModal}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDataDashboard;