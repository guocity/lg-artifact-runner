import { useState, useEffect, useRef } from 'react';
import hotelData from './hyatt.json';

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

// Define interfaces
interface Region {
  key: string;
  label: string;
}

interface Country {
  label: string;
}

interface Geolocation {
  latitude: number;
  longitude: number;
}

interface Location {
  region: Region;
  geolocation: Geolocation;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: Country;
}

interface Brand {
  key: string;
  label: string;
}

interface AwardCategory {
  key: string;
  label: string;
}

interface AwardType {
  label: string;
}

interface Hotel {
  name: string;
  image: string;
  url: string;
  allInclusive?: string;
  brand?: Brand;
  description?: string;
  location: Location;
  awardCategory?: AwardCategory;
  awardTypes?: AwardType[];
}

// Brand color mapping
const brandColors: { [key: string]: string } = {
  'UNBOUND': '#DAA520', // Luxury - Goldenrod
  // Luxury - orange gold#c65600
  'MIRAVAL': '#c65600',
  // Luxury - Pink Gold#f70fc5
  'PARK': '#f70fc5',
  // Luxury - Rose Gold
  'ALILA': '#B76E79',
  // Luxury - metallic gold
  'IMPRESSION': '#D4AF37',
  // Lifestyle - Red green
  'ANDAZ': '#FF4500',
  //hyatt color dark #156499
  'HOUSE': '#156499', // Lifestyle - Medium Sea Green
  //hyatt color #2B9BE6
  'PLACE': '#2B9BE6', // Essentials - Medium Aquamarine
  'ME_AND_ALL': '#32CD32', // Lifestyle - Lime Green
  // Classics - Red Purple #8B008B
  'REGENCY': '#8B008B',
  'ALUA': '#B8860B', // Inclusive - Dark Goldenrod
  // Classics - Midnight Blue #0156c5
  'HYATT': '#0156c5',
  // Classics - #611bbd
  'GRAND': '#611bbd',
  'JDV': '#228B22', // Lifestyle - Forest Green
  'CENTRIC': '#87CEFA', // Classics - Light Sky Blue
  'THOMPSON': '#2E8B57', // Lifestyle - Sea Green
  'PARTNERS': '#B22222', // Inclusive - Firebrick
  'VACATION': '#ADD8E6', // Classics - Light Blue
  'CAPTION': '#87CEFA', // Essentials - Light Sky Blue
  'DREAM': '#DC143C', // Inclusive - Crimson
  'BREATHLESS': '#FF4500', // Inclusive - Orange Red
  'DESTINATION': '#000080', // Classics - Navy
  'ZILARA': '#FF0000', // Inclusive - Red
  'ZIVA': '#8B0000', // Inclusive - Dark Red
  'DREAMS': '#FF6347', // Inclusive - Tomato
  'VIVID': '#FF1493', // Inclusive - Deep Pink
  // Essentials - yellow #FFD700
  'MR_MRS_SMITH': '#FFD700',
  'STUDIOS': '#ADD8E6', // Essentials - Light Blue
  'SECRETS': '#FF69B4', // Inclusive - Hot Pink
  'SUNSCAPE': '#87CEFA', // Inclusive - Light Sky Blue
  'URCOVE': '#87CEFA', // Essentials - Light Sky Blue
  'ZOETRY': '#FF0000', // Inclusive - Red
  // Others - dark gray
  'NO_BRAND': '#333',
};

// Add brand groups
const brandGroups: { [key: string]: string[] } = {
  'Luxury': ['PARK', 'ALILA', 'MIRAVAL', 'IMPRESSION','UNBOUND'],
  'Lifestyle': ['ANDAZ', 'THOMPSON', 'JDV', 'DREAM', 'CAPTION', 'BREATHLESS', 'ME_AND_ALL'],
  'Inclusive': ['ZOETRY', 'ZIVA', 'ZILARA', 'DREAMS', 'VIVID', 'SUNSCAPE', 'ALUA','SECRETS'],
  'Classics': ['GRAND', 'REGENCY', 'DESTINATION', 'CENTRIC', 'VACATION', 'HYATT'],
  'Essentials': ['CAPTION', 'PLACE', 'HOUSE', 'STUDIOS', 'URCOVE']
};

// Add 'Others' group for ungrouped brands and no brand
const allGroupedBrands = new Set(Object.values(brandGroups).flat());
const others = Object.keys(brandColors).filter(
  brand => !allGroupedBrands.has(brand) && brand !== 'NO_BRAND'
);
if (others.length > 0) {
  brandGroups['Others'] = [...others, 'NO_BRAND'];
} else {
  brandGroups['Others'] = ['NO_BRAND'];
}

const awardCategoryCounts: { [key: string]: number } = Object.values(hotelData).reduce((acc, hotel) => {
  const category = hotel.awardCategory?.key || 'No Category';
  acc[category] = (acc[category] || 0) + 1;
  return acc;
}, {});

const HotelMap: React.FC = () => {
  const [locations, setLocations] = useState<Hotel[]>([]);
  const [visibleBrands, setVisibleBrands] = useState<string[]>(() => {
    const saved = localStorage.getItem('visibleBrands');
    return saved ? JSON.parse(saved) : Object.keys(brandColors);
  });
  const [visibleAwardCategories, setVisibleAwardCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('visibleAwardCategories');
    return saved ? JSON.parse(saved) : [...Object.keys(awardCategoryCounts)];
  });
  const [isAwardCategoryOpen, setIsAwardCategoryOpen] = useState<boolean>(true);
  const [isBrandOpen, setIsBrandOpen] = useState<boolean>(true);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [openedInfoWindows, setOpenedInfoWindows] = useState<string[]>(() => {
    const saved = localStorage.getItem('openedInfoWindows');
    return saved ? JSON.parse(saved) : [];
  });
  const [isRegionOpen, setIsRegionOpen] = useState<boolean>(true);

  // Add state for visible regions
  const [visibleRegions, setVisibleRegions] = useState<string[]>(() => {
    const saved = localStorage.getItem('visibleRegions');
    const allRegions = Array.from(new Set(Object.values(hotelData).map(hotel => hotel.location.region.key)));
    return saved ? JSON.parse(saved) : allRegions;
  });

  // Compute region counts
  const regionCounts = Object.values(hotelData).reduce((acc, hotel) => {
    const region = hotel.location.region?.key || 'No Region';
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {});

  // Persist visible regions to local storage
  useEffect(() => {
    localStorage.setItem('visibleRegions', JSON.stringify(visibleRegions));
  }, [visibleRegions]);

  // Handle region toggle
  const handleRegionToggle = (region: string) => {
    setVisibleRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  // Check all regions
  const checkAllRegions = () => {
    const allRegions = Object.keys(regionCounts);
    setVisibleRegions(allRegions);
  };

  // Uncheck all regions
  const uncheckAllRegions = () => {
    setVisibleRegions([]);
  };

  useEffect(() => {
    localStorage.setItem('openedInfoWindows', JSON.stringify(openedInfoWindows));
  }, [openedInfoWindows]);

  useEffect(() => {
    localStorage.setItem('visibleBrands', JSON.stringify(visibleBrands));
  }, [visibleBrands]);

  useEffect(() => {
    localStorage.setItem('visibleAwardCategories', JSON.stringify(visibleAwardCategories));
  }, [visibleAwardCategories]);

  // Add a ref to store markers by brand
  const markersRef = useRef<{ [brand: string]: google.maps.Marker[] }>({});

  // Initialize map when component mounts
  useEffect(() => {
    const initGoogleMaps = () => {
      if (typeof window.google === 'undefined') {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyC81wzVXNw2rzWExz8p7a5ChbTwVmBRvtw`;
        script.async = true;
        script.defer = true;
        
        script.addEventListener('load', () => {
          setMapLoaded(true);
        });

        script.addEventListener('error', (e: Event) => {
          console.error('Error loading Google Maps:', e);
        });

        document.head.appendChild(script);
      } else {
        setMapLoaded(true);
      }
    };

    initGoogleMaps();
  }, []);

  useEffect(() => {
    if (!mapLoaded || !window.google || !window.google.maps) {
      return;
    }
    
    try {
      doInitMap();
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [visibleBrands, visibleAwardCategories, visibleRegions, mapLoaded]);

  const handleBrandToggle = (brand: string) => {
    setVisibleBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleAwardCategoryToggle = (category: string) => {
    setVisibleAwardCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const checkAllBrands = () => {
    setVisibleBrands(Object.keys(brandColors));
  };

  const uncheckAllBrands = () => {
    setVisibleBrands([]);
  };

  const checkAllAwardCategories = () => {
    setVisibleAwardCategories(Object.keys(awardCategoryCounts));
  };

  const uncheckAllAwardCategories = () => {
    setVisibleAwardCategories([]);
  };

  const brandCounts: { [key: string]: number } = Object.values(hotelData).reduce((acc, hotel) => {
    const brand = hotel.brand?.key || 'NO_BRAND';
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {});

  const handleInfoWindowClose = (key: string) => {
    const newOpenedWindows = openedInfoWindows.filter(id => id !== key);
    localStorage.setItem('openedInfoWindows', JSON.stringify(newOpenedWindows));
    setOpenedInfoWindows(newOpenedWindows);
  };

  const doInitMap = () => {
    const savedCenter = localStorage.getItem('mapCenter');
    const savedZoom = localStorage.getItem('mapZoom');
    const defaultCenter = savedCenter ? JSON.parse(savedCenter) : { lat: 39.8283, lng: -98.5795 };
    const defaultZoom = savedZoom ? JSON.parse(savedZoom) : 4;

    const map = new window.google.maps.Map(document.getElementById('map') as HTMLElement, {
      zoom: defaultZoom,
      center: defaultCenter,
      styles: [
        {
          featureType: 'all',
          elementType: 'all',
          stylers: [{ saturation: -100 }]
        }
      ]
    });

    map.addListener('idle', () => {
      const center = map.getCenter();
      if (center) {
        localStorage.setItem('mapCenter', JSON.stringify({ lat: center.lat(), lng: center.lng() }));
        localStorage.setItem('mapZoom', JSON.stringify(map.getZoom()));
      }
    });

    // Add markers for each location
    Object.entries(hotelData).forEach(([key, hotel]: [string, Hotel]) => {
      const brandKey = hotel.brand?.key || 'NO_BRAND';
      const awardCategory = hotel.awardCategory?.key || 'No Category';
      const regionKey = hotel.location.region?.key || 'No Region';
      if (
        !visibleBrands.includes(brandKey) ||
        !visibleAwardCategories.includes(awardCategory) ||
        !visibleRegions.includes(regionKey)
      ) return;

      const position: google.maps.LatLngLiteral = {
        lat: hotel.location.geolocation.latitude,
        lng: hotel.location.geolocation.longitude
      };

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: hotel.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: brandColors[brandKey],
          fillOpacity: 1,
          strokeWeight: 0,
          scale: 5 // Reduced scale to make the dot smaller
        }
      });

      // Store marker by brand
      if (!markersRef.current[brandKey]) {
        markersRef.current[brandKey] = [];
      }
      markersRef.current[brandKey].push(marker);

      let isFixed = openedInfoWindows.includes(key);

      // Update info window styling and content
      const infoWindow = new window.google.maps.InfoWindow({
        content: '',
        disableAutoPan: true,
        pixelOffset: new window.google.maps.Size(0, -5),
        closeButton: false
      });

      if (isFixed) {
        const content = `
          <div style="width: 300px; padding: 12px; padding-top: 0; font-family: Arial, sans-serif;">
            <img src="${hotel.image}" alt="${hotel.name}" style="width: 100%; height: 200px; object-fit: cover; margin-bottom: 8px;" />
            <a href="${hotel.url}" style="font-size: 16px; font-weight: bold; color: #0066cc; text-decoration: none; display: block; margin-bottom: 4px;">
              ${hotel.name}${hotel.allInclusive === "All-Inclusive" ? ' <span style="color: red; font-weight: bold;">All-Inclusive</span>' : ''}
            </a>
            <div style="font-weight: 500; color: #666; margin-bottom: 4px;">${hotel.brand?.label || 'No Brand'}</div>
            <div style="font-size: 13px; color: #444; margin-bottom: 8px;">${hotel.description || ''}</div>
            <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
              ${hotel.location.addressLine1 || ''} ${hotel.location.addressLine2 || ''}<br>
              ${hotel.location.city || ''}, ${hotel.location.country?.label || ''}
            </div>
            <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
              Award Category: ${hotel.awardCategory?.label || 'N/A'}
            </div>
            <div style="font-size: 13px; color: #666;">
              Award Types: ${hotel.awardTypes?.map(award => award.label).join(', ') || 'N/A'}
            </div>
          </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
        infoWindow.addListener('closeclick', () => handleInfoWindowClose(key));
      }

      marker.addListener('mouseover', () => {
        if (!isFixed) {
          const content = `
            <div style="width: 300px; padding: 12px; padding-top: 0; font-family: Arial, sans-serif;">
              <img src="${hotel.image}" alt="${hotel.name}" style="width: 100%; height: 200px; object-fit: cover; margin-bottom: 8px;" />
              <a href="${hotel.url}" style="font-size: 16px; font-weight: bold; color: #0066cc; text-decoration: none; display: block; margin-bottom: 4px;">
                ${hotel.name}${hotel.allInclusive === "All-Inclusive" ? ' <span style="color: red; font-weight: bold;">All-Inclusive</span>' : ''}
              </a>
              <div style="font-weight: 500; color: #666; margin-bottom: 4px;">${hotel.brand?.label || 'No Brand'}</div>
              <div style="font-size: 13px; color: #444; margin-bottom: 8px;">${hotel.description || ''}</div>
              <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                ${hotel.location.addressLine1 || ''} ${hotel.location.addressLine2 || ''}<br>
                ${hotel.location.city || ''}, ${hotel.location.country?.label || ''}
              </div>
              <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                Award Category: ${hotel.awardCategory?.label || 'N/A'}
              </div>
              <div style="font-size: 13px; color: #666;">
                Award Types: ${hotel.awardTypes?.map(award => award.label).join(', ') || 'N/A'}
              </div>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        }
      });

      marker.addListener('mouseout', () => {
        if (!isFixed) {
          infoWindow.close();
        }
      });

      marker.addListener('click', () => {
        isFixed = !isFixed;
        if (isFixed) {
          const newState = [...openedInfoWindows, key];
          localStorage.setItem('openedInfoWindows', JSON.stringify(newState));
          setOpenedInfoWindows(newState);
          const content = `
            <div style="width: 300px; padding: 12px; padding-top: 0; font-family: Arial, sans-serif;">
              <img src="${hotel.image}" alt="${hotel.name}" style="width: 100%; height: 200px; object-fit: cover; margin-bottom: 8px;" />
              <a href="${hotel.url}" style="font-size: 16px; font-weight: bold; color: #0066cc; text-decoration: none; display: block; margin-bottom: 4px;">
                ${hotel.name}${hotel.allInclusive === "All-Inclusive" ? ' <span style="color: red; font-weight: bold;">All-Inclusive</span>' : ''}
              </a>
              <div style="font-weight: 500; color: #666; margin-bottom: 4px;">${hotel.brand?.label || 'No Brand'}</div>
              <div style="font-size: 13px; color: #444; margin-bottom: 8px;">${hotel.description || ''}</div>
              <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                ${hotel.location.addressLine1 || ''} ${hotel.location.addressLine2 || ''}<br>
                ${hotel.location.city || ''}, ${hotel.location.country?.label || ''}
              </div>
              <div style="font-size: 13px; color: #666;">
                Award Category: ${hotel.awardCategory?.label || 'N/A'}
              </div>
              <div style="font-size: 13px; color: #666;">
                Award Types: ${hotel.awardTypes?.map(award => award.label).join(', ') || 'N/A'}
              </div>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
          infoWindow.addListener('closeclick', () => handleInfoWindowClose(key));
        } else {
          handleInfoWindowClose(key);
          infoWindow.close();
        }
      });
    });
  };

  // Function to add black border to markers of a specific brand and bring them to front
  const addBrandHover = (brand: string) => {
    const markers = markersRef.current[brand];
    if (markers) {
      markers.forEach(marker => {
        marker.setIcon({
          ...marker.getIcon(),
          strokeColor: '#000000',
          strokeWeight: 3,
        });
        marker.setZIndex(google.maps.Marker.MAX_ZINDEX);
      });
    }
  };

  // Function to remove black border from markers of a specific brand and reset zIndex
  const removeBrandHover = (brand: string) => {
    const markers = markersRef.current[brand];
    if (markers) {
      markers.forEach(marker => {
        marker.setIcon({
          ...marker.getIcon(),
          strokeColor: undefined,
          strokeWeight: 0,
        });
        marker.setZIndex(undefined);
      });
    }
  };

  return (
    <div className="w-full h-screen relative">
      <div className="absolute top-0 left-0 p-4 bg-white z-10 max-h-screen overflow-y-auto">
        <div className="mb-4">
          <div 
            className="flex items-center justify-between mb-2 bg-gray-100 p-2 rounded" 
            onClick={() => setIsRegionOpen(!isRegionOpen)}
          >
            <h2 className="font-bold">Location</h2>
            <button 
              className="text-gray-600"
              onClick={(e) => e.stopPropagation()}
            >
              {isRegionOpen ? '−' : '+'}
            </button>
          </div>
          {isRegionOpen && (
            <>
              <div className="mb-2">
                <button onClick={checkAllRegions} className="mr-2 p-2 bg-blue-500 text-white text-sm rounded">Check All</button>
                <button onClick={uncheckAllRegions} className="p-2 bg-red-500 text-white text-sm rounded">Uncheck All</button>
              </div>
              {Object.entries(regionCounts).map(([region, count]) => {
                const label = Object.values(hotelData).find(hotel => hotel.location.region?.key === region)?.location.region?.label;
                return (
                  <div key={region} className="flex items-center mb-2 ml-2">
                    <input
                      type="checkbox"
                      checked={visibleRegions.includes(region)}
                      onChange={() => handleRegionToggle(region)}
                      className="mr-2"
                    />
                    <span>{label || region} ({count})</span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="mb-4">
          <div 
            className="flex items-center justify-between mb-2 bg-gray-100 p-2 rounded" 
            onClick={() => setIsAwardCategoryOpen(!isAwardCategoryOpen)}
          >
            <h2 className="font-bold">Award Category</h2>
            <button 
              className="text-gray-600"
              onClick={(e) => e.stopPropagation()}
            >
              {isAwardCategoryOpen ? '−' : '+'}
            </button>
          </div>
          {isAwardCategoryOpen && (
            <>
              <div className="mb-2">
                <button onClick={checkAllAwardCategories} className="mr-2 p-2 bg-blue-500 text-white text-sm rounded">Check All</button>
                <button onClick={uncheckAllAwardCategories} className="p-2 bg-red-500 text-white text-sm rounded">Uncheck All</button>
              </div>
              {Object.entries(awardCategoryCounts).map(([category, count]) => {
                const label = Object.values(hotelData).find(hotel => hotel.awardCategory?.key === category)?.awardCategory?.label;
                return (
                  <div key={category} className="flex items-center mb-2 ml-2">
                    <input
                      type="checkbox"
                      checked={visibleAwardCategories.includes(category)}
                      onChange={() => handleAwardCategoryToggle(category)}
                      className="mr-2"
                    />
                    <span>
                      {category}{label && label !== category ? ` - ${label}` : ''} ({count})
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="mb-4">
          <div 
            className="flex items-center justify-between mb-2 bg-gray-100 p-2 rounded" 
            onClick={() => setIsBrandOpen(!isBrandOpen)}
          >
            <h2 className="font-bold">Brand</h2>
            <button 
              className="text-gray-600"
              onClick={(e) => e.stopPropagation()}
            >
              {isBrandOpen ? '−' : '+'}
            </button>
          </div>
          {isBrandOpen && (
            <>
              <div className="mb-2">
                <button onClick={checkAllBrands} className="mr-2 p-2 bg-blue-500 text-white text-sm rounded">Check All</button>
                <button onClick={uncheckAllBrands} className="p-2 bg-red-500 text-white text-sm rounded">Uncheck All</button>
              </div>
              {Object.entries(brandGroups).map(([group, brands]) => (
                <div key={group}>
                  <div className="text-gray-500 font-semibold mt-4">{group}</div>
                  {brands.map((brand) => {
                    const color = brandColors[brand];
                    const brandLabel = brand === 'SMALL_LUXURY' ? 'Small Luxury Hotels of the World' : 
                                       brand === 'SECRETS_RESORTS' ? 'Secrets Resorts & Spas' :
                                       brand === 'DREAMS_RESORTS' ? 'Dreams Resorts & Spas' :
                                       hotelData[Object.keys(hotelData).find(key => hotelData[key].brand?.key === brand)]?.brand?.label || 
                                       (brand === 'NO_BRAND' ? 'No Brand' : brand);
                    return (
                      <div 
                        key={brand} 
                        className="flex items-center mb-2 ml-4"
                        onMouseEnter={() => addBrandHover(brand)}
                        onMouseLeave={() => removeBrandHover(brand)}
                      >
                        <input
                          type="checkbox"
                          checked={visibleBrands.includes(brand)}
                          onChange={() => handleBrandToggle(brand)}
                          className="mr-2"
                        />
                        <span
                          className="w-4 h-4 inline-block mr-2"
                          style={{ backgroundColor: color }}
                        ></span>
                        <span>{brandLabel} ({brandCounts[brand] || 0})</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      <div id="map" className="w-full h-full absolute top-0 left-0"/>
    </div>
  );
};

export default HotelMap;