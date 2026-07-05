import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

const BRAND_VIDEOS = {
  tesla: 'https://assets.mixkit.co/videos/preview/mixkit-car-driving-down-a-curved-road-in-autumn-41604-large.mp4',
  porsche: 'https://assets.mixkit.co/videos/preview/mixkit-forest-road-from-inside-a-car-windshield-32517-large.mp4',
  jeep: 'https://assets.mixkit.co/videos/preview/mixkit-driving-in-the-sunset-32529-large.mp4',
  toyota: 'https://assets.mixkit.co/videos/preview/mixkit-daytime-city-traffic-aerial-view-56-large.mp4',
  bmw: 'https://assets.mixkit.co/videos/preview/mixkit-sports-car-interior-with-digital-dashboard-34433-large.mp4',
  ford: 'https://assets.mixkit.co/videos/preview/mixkit-hands-on-a-steering-wheel-of-a-car-34443-large.mp4',
  audi: 'https://assets.mixkit.co/videos/preview/mixkit-tunnel-view-from-inside-a-car-34435-large.mp4',
  honda: 'https://assets.mixkit.co/videos/preview/mixkit-driving-on-highway-at-night-aerial-view-39832-large.mp4',
  chevrolet: 'https://assets.mixkit.co/videos/preview/mixkit-classic-car-steering-wheel-and-dashboard-34439-large.mp4',
  'mercedes-benz': 'https://assets.mixkit.co/videos/preview/mixkit-holding-hands-in-a-driving-car-34440-large.mp4',
  hyundai: 'https://assets.mixkit.co/videos/preview/mixkit-rain-drops-on-car-windshield-at-night-39757-large.mp4',
  default: 'https://assets.mixkit.co/videos/preview/mixkit-car-driving-down-a-curved-road-in-autumn-41604-large.mp4'
};

const MOCK_VEHICLES = [
  {
    seller_id: 'john_seller_id',
    seller_name: 'john_seller',
    seller_rating: 4.8,
    make: 'Tesla',
    model: 'Model S Plaid',
    year: 2023,
    price: 85000,
    condition: 'excellent',
    mileage: 12000,
    engine: 'Tri-Motor Electric',
    transmission: 'Automatic',
    fuel_type: 'electric',
    image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
    description: 'Fully loaded electric beast in deep sea blue. Dynamic steering, autopilot enabled, clean title.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'San Francisco, CA'
  },
  {
    seller_id: 'john_seller_id',
    seller_name: 'john_seller',
    seller_rating: 4.8,
    make: 'Porsche',
    model: '911 Carrera GTS',
    year: 2021,
    price: 125000,
    condition: 'excellent',
    mileage: 9500,
    engine: '3.0L Twin-Turbo Flat-6',
    transmission: 'PDK (Automatic)',
    fuel_type: 'gasoline',
    image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    description: 'Jet Black Metallic. Full leather package, premium Bose audio, sport exhaust system, brand new tires.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Miami, FL'
  },
  {
    seller_id: 'sara_dealer_id',
    seller_name: 'sara_dealer',
    seller_rating: 4.9,
    make: 'Jeep',
    model: 'Wrangler Rubicon',
    year: 2022,
    price: 48000,
    condition: 'good',
    mileage: 22000,
    engine: '2.0L Turbo I4',
    transmission: 'Manual',
    fuel_type: 'gasoline',
    image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    description: 'Trail-ready Rubicon in Sarge Green. 35-inch offroad tires, winch, custom steel bumper, lift kit.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Denver, CO'
  },
  {
    seller_id: 'sara_dealer_id',
    seller_name: 'sara_dealer',
    seller_rating: 4.9,
    make: 'Toyota',
    model: 'RAV4 Prime',
    year: 2022,
    price: 38500,
    condition: 'excellent',
    mileage: 15000,
    engine: '2.5L 4-Cylinder Plug-In Hybrid',
    transmission: 'eCVT (Automatic)',
    fuel_type: 'hybrid',
    image_url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
    description: 'Pristine RAV4 Prime plug-in hybrid. Fast charging, AWD, zero mechanical issues, clean title, great daily driver.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Seattle, WA'
  },
  {
    seller_id: 'john_seller_id',
    seller_name: 'john_seller',
    seller_rating: 4.8,
    make: 'BMW',
    model: 'M4 Competition',
    year: 2021,
    price: 72000,
    condition: 'excellent',
    mileage: 18000,
    engine: '3.0L Twin-Turbo Inline-6',
    transmission: '8-Speed Sport Automatic',
    fuel_type: 'gasoline',
    image_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    description: 'Gorgeous Portimao Blue Metallic BMW M4 Competition. Executive package, carbon fiber interior trim, carbon roof, absolute missile.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Los Angeles, CA'
  },
  {
    seller_id: 'john_seller_id',
    seller_name: 'john_seller',
    seller_rating: 4.8,
    make: 'Ford',
    model: 'Mustang Mach-E GT',
    year: 2023,
    price: 51000,
    condition: 'excellent',
    mileage: 8000,
    engine: 'Dual-Motor Electric',
    transmission: 'Automatic',
    fuel_type: 'electric',
    image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80',
    description: 'Rapid Red Mustang Mach-E GT. Performance Edition with MagneRide damping system, extended battery, single owner.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Chicago, IL'
  },
  {
    seller_id: 'sara_dealer_id',
    seller_name: 'sara_dealer',
    seller_rating: 4.9,
    make: 'Audi',
    model: 'e-tron GT',
    year: 2022,
    price: 89000,
    condition: 'excellent',
    mileage: 11000,
    engine: 'Dual-Motor Electric',
    transmission: 'Automatic',
    fuel_type: 'electric',
    image_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
    description: 'Stunning Audi e-tron GT in Daytona Gray. Leather seats, high-fidelity sound, pristine battery health.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Seattle, WA'
  },
  {
    seller_id: 'john_seller_id',
    seller_name: 'john_seller',
    seller_rating: 4.8,
    make: 'Honda',
    model: 'Civic Type R',
    year: 2023,
    price: 43500,
    condition: 'excellent',
    mileage: 5000,
    engine: '2.0L Turbo I4',
    transmission: 'Manual',
    fuel_type: 'gasoline',
    image_url: 'https://images.unsplash.com/photo-1627454820516-dc767bcb4d3e?auto=format&fit=crop&w=800&q=80',
    description: 'Championship White Civic Type R. 6-speed manual, red bucket seats, unmodified, single owner, stored in garage.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Boston, MA'
  },
  {
    seller_id: 'sara_dealer_id',
    seller_name: 'sara_dealer',
    seller_rating: 4.9,
    make: 'Chevrolet',
    model: 'Corvette Stingray',
    year: 2022,
    price: 68000,
    condition: 'good',
    mileage: 14000,
    engine: '6.2L V8',
    transmission: 'Automatic',
    fuel_type: 'gasoline',
    image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    description: 'Mid-engine Stingray in Torch Red. Z51 performance package, front lift, performance exhaust, absolute head-turner.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Austin, TX'
  },
  {
    seller_id: 'john_seller_id',
    seller_name: 'john_seller',
    seller_rating: 4.8,
    make: 'Mercedes-Benz',
    model: 'C300',
    year: 2021,
    price: 36000,
    condition: 'good',
    mileage: 28000,
    engine: '2.0L Turbo I4',
    transmission: 'Automatic',
    fuel_type: 'gasoline',
    image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    description: 'Polar White C-Class. Panoramic sunroof, heated seats, driver assistance package, dealer serviced.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Atlanta, GA'
  },
  {
    seller_id: 'sara_dealer_id',
    seller_name: 'sara_dealer',
    seller_rating: 4.9,
    make: 'Hyundai',
    model: 'Ioniq 5',
    year: 2023,
    price: 45000,
    condition: 'excellent',
    mileage: 9000,
    engine: 'Permanent Magnet Synchronous Motor',
    transmission: 'Automatic',
    fuel_type: 'electric',
    image_url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80',
    description: 'Cyber Gray Ioniq 5 Limited. Ultra-fast 800V charging, vision roof, sliding center console, perfect condition.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Portland, OR'
  },
  {
    seller_id: 'john_seller_id',
    seller_name: 'john_seller',
    seller_rating: 4.8,
    make: 'Tesla',
    model: 'Model Y Performance',
    year: 2022,
    price: 47000,
    condition: 'excellent',
    mileage: 19000,
    engine: 'Dual-Motor Electric',
    transmission: 'Automatic',
    fuel_type: 'electric',
    image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80',
    description: 'Red Multi-Coat Model Y. 21-inch Uberturbine wheels, performance brakes, carbon fiber spoiler, clean record.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Phoenix, AZ'
  },
  {
    seller_id: 'sara_dealer_id',
    seller_name: 'sara_dealer',
    seller_rating: 4.9,
    make: 'Ford',
    model: 'F-150 Lightning',
    year: 2023,
    price: 59000,
    condition: 'excellent',
    mileage: 6000,
    engine: 'Dual-Motor Electric',
    transmission: 'Automatic',
    fuel_type: 'electric',
    image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80',
    description: 'Antimatter Blue Metallic Lightning Lariat. Pro Power Onboard (9.6kW), extended range battery, pristine condition.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'Detroit, MI'
  },
  {
    seller_id: 'john_seller_id',
    seller_name: 'john_seller',
    seller_rating: 4.8,
    make: 'BMW',
    model: 'i4 M50',
    year: 2023,
    price: 64000,
    condition: 'excellent',
    mileage: 7500,
    engine: 'Dual-Motor Electric',
    transmission: 'Automatic',
    fuel_type: 'electric',
    image_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    description: 'Frozen Portimao Blue. M Sport package, adaptive M suspension, high-end sound system, fast charging capability.',
    status: 'available',
    stock: 5,
    usage_type: 'used',
    location: 'New York, NY'
  },
  {
    seller_id: 'john_seller_id',
    seller_name: 'john_seller',
    seller_rating: 4.8,
    make: 'Rolls-Royce',
    model: 'Phantom Extended',
    year: 2024,
    price: 480000,
    condition: 'excellent',
    mileage: 500,
    engine: '6.75L Twin-Turbo V12',
    transmission: 'Automatic',
    fuel_type: 'gasoline',
    image_url: 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=800&q=80',
    description: 'The pinnacle of luxury motoring. Commissioned with a custom starlight headliner, rear theater suite, and personalized treadplates. Immaculate showroom condition.',
    status: 'available',
    stock: 5,
    usage_type: 'new',
    location: 'Beverly Hills, CA'
  },
  {
    seller_id: 'sara_dealer_id',
    seller_name: 'sara_dealer',
    seller_rating: 4.9,
    make: 'Ferrari',
    model: 'SF90 Stradale',
    year: 2023,
    price: 520000,
    condition: 'excellent',
    mileage: 1200,
    engine: '4.0L Twin-Turbo V8 Hybrid',
    transmission: 'Automatic',
    fuel_type: 'hybrid',
    image_url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80',
    description: 'Stunning Rosso Corsa SF90. Assetto Fiorano package, carbon fiber exterior/interior, track telemetry, absolute masterpiece.',
    status: 'available',
    stock: 5,
    usage_type: 'new',
    location: 'Los Angeles, CA'
  }
];

function Showroom({ onSelectVehicle, currency, formatPrice, EXCHANGE_RATE }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [usageType, setUsageType] = useState('used');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [q, setQ] = useState('');
  const [make, setMake] = useState('');
  const [condition, setCondition] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const vehiclesCol = collection(db, 'vehicles');
      
      // 2.5 second timeout to prevent hanging if Firestore rules/setup is unconfigured
      const getDocsPromise = getDocs(vehiclesCol);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore timeout')), 2500)
      );

      const querySnapshot = await Promise.race([getDocsPromise, timeoutPromise]);
      let list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // If empty, auto-seed default mock vehicles
      if (list.length === 0) {
        console.log('No vehicles in Firestore. Seeding default data...');
        for (const v of MOCK_VEHICLES) {
          try {
            const docRef = await addDoc(vehiclesCol, {
              ...v,
              created_at: new Date().toISOString()
            });
            list.push({ id: docRef.id, ...v, created_at: new Date().toISOString() });
          } catch (seedErr) {
            console.error('Failed to seed vehicle:', v.make, seedErr.message);
          }
        }
      }

      // Filter locally for simplicity and speed
      let filtered = list;

      if (usageType) {
        filtered = filtered.filter(v => v.usage_type === usageType);
      }
      if (make) {
        filtered = filtered.filter(v => v.make.toLowerCase() === make.toLowerCase());
      }
      if (condition) {
        filtered = filtered.filter(v => v.condition === condition);
      }

      let usdMinPrice = minPrice;
      let usdMaxPrice = maxPrice;
      if (currency === 'INR') {
        if (minPrice) usdMinPrice = parseFloat(minPrice) / EXCHANGE_RATE;
        if (maxPrice) usdMaxPrice = parseFloat(maxPrice) / EXCHANGE_RATE;
      }

      if (usdMinPrice) {
        filtered = filtered.filter(v => v.price >= parseFloat(usdMinPrice));
      }
      if (usdMaxPrice) {
        filtered = filtered.filter(v => v.price <= parseFloat(usdMaxPrice));
      }

      if (q) {
        const queryStr = q.toLowerCase();
        filtered = filtered.filter(v => 
          v.make.toLowerCase().includes(queryStr) || 
          v.model.toLowerCase().includes(queryStr) || 
          (v.description && v.description.toLowerCase().includes(queryStr))
        );
      }

      // Sort by created_at DESC
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setVehicles(filtered);
    } catch (err) {
      console.warn('Firestore fetch failed/timeout. Falling back to local mock data:', err.message);
      
      // Filter local MOCK_VEHICLES array directly
      let filtered = MOCK_VEHICLES.map((v, i) => ({ id: `local-fallback-${i}`, ...v }));

      if (usageType) {
        filtered = filtered.filter(v => v.usage_type === usageType);
      }
      if (make) {
        filtered = filtered.filter(v => v.make.toLowerCase() === make.toLowerCase());
      }
      if (condition) {
        filtered = filtered.filter(v => v.condition === condition);
      }

      let usdMinPrice = minPrice;
      let usdMaxPrice = maxPrice;
      if (currency === 'INR') {
        if (minPrice) usdMinPrice = parseFloat(minPrice) / EXCHANGE_RATE;
        if (maxPrice) usdMaxPrice = parseFloat(maxPrice) / EXCHANGE_RATE;
      }

      if (usdMinPrice) {
        filtered = filtered.filter(v => v.price >= parseFloat(usdMinPrice));
      }
      if (usdMaxPrice) {
        filtered = filtered.filter(v => v.price <= parseFloat(usdMaxPrice));
      }

      if (q) {
        const queryStr = q.toLowerCase();
        filtered = filtered.filter(v => 
          v.make.toLowerCase().includes(queryStr) || 
          v.model.toLowerCase().includes(queryStr) || 
          (v.description && v.description.toLowerCase().includes(queryStr))
        );
      }

      // Sort by default mock order or price
      setVehicles(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [make, condition, usageType]);

  // Dynamically convert filter min/max input values when currency toggles
  useEffect(() => {
    if (currency === 'INR') {
      if (minPrice) setMinPrice(Math.round(parseFloat(minPrice) * EXCHANGE_RATE).toString());
      if (maxPrice) setMaxPrice(Math.round(parseFloat(maxPrice) * EXCHANGE_RATE).toString());
    } else {
      if (minPrice) setMinPrice(Math.round(parseFloat(minPrice) / EXCHANGE_RATE).toString());
      if (maxPrice) setMaxPrice(Math.round(parseFloat(maxPrice) / EXCHANGE_RATE).toString());
    }
  }, [currency]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVehicles();
  };

  const clearFilters = async () => {
    setQ('');
    setMake('');
    setCondition('');
    setMinPrice('');
    setMaxPrice('');
    setUsageType('used');
    setLoading(true);
    try {
      const vehiclesCol = collection(db, 'vehicles');
      const querySnapshot = await getDocs(vehiclesCol);
      let list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      let filtered = list.filter(v => v.usage_type === 'used');
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setVehicles(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl">
      {/* Showroom search banner */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 p-8 md:p-12 mb-12 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="max-w-2xl space-y-4">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
            Find Your Next Drive
          </h2>
          <p className="text-slate-400 text-sm md:text-base">
            Search hundreds of verified second-hand listings. Secure your funds in escrow, check ratings, and finalize transactions securely.
          </p>
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 pt-2">
            <input 
              type="text" 
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search make, model, electric features..." 
              className="flex-grow rounded-2xl bg-slate-950 border border-slate-800 px-5 py-4 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
            />
            <button 
              type="submit" 
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition-all"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Custom Popup Dropdown Option */}
      <div className="relative mb-8 z-30">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="px-6 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all duration-300 hover:border-cyan-500/50 hover:bg-slate-850/80 shadow-md flex items-center gap-2 cursor-pointer"
        >
          {usageType === 'new' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Category: <strong className="text-white">✨ New Vehicles</strong></span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Category: <strong className="text-white">🚘 Second Hand Vehicles</strong></span>
            </>
          )}
          <span className="ml-2 text-[10px] text-slate-500">▼</span>
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 p-2 shadow-2xl z-50">
            <button
              onClick={() => { setUsageType('new'); setDropdownOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                usageType === 'new'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${usageType === 'new' ? 'bg-slate-950' : 'bg-cyan-400'}`} />
              ✨ New Vehicles
            </button>
            <button
              onClick={() => { setUsageType('used'); setDropdownOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 mt-1 cursor-pointer ${
                usageType === 'used'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${usageType === 'used' ? 'bg-slate-950' : 'bg-amber-400'}`} />
              🚘 Second Hand Vehicles
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 h-fit space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">Filters</h3>
            <button onClick={clearFilters} className="text-xs text-cyan-400 font-semibold hover:underline">
              Clear All
            </button>
          </div>

          {/* Make Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Manufacturer</label>
            <select
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none transition-colors"
            >
              <option value="">All Brands</option>
              <option value="Ferrari">Ferrari</option>
              <option value="Lamborghini">Lamborghini</option>
              <option value="Rolls-Royce">Rolls-Royce</option>
              <option value="Aston Martin">Aston Martin</option>
              <option value="Tesla">Tesla</option>
              <option value="Porsche">Porsche</option>
              <option value="Jeep">Jeep</option>
              <option value="Toyota">Toyota</option>
              <option value="BMW">BMW</option>
              <option value="Ford">Ford</option>
              <option value="Audi">Audi</option>
              <option value="Honda">Honda</option>
              <option value="Chevrolet">Chevrolet</option>
              <option value="Mercedes-Benz">Mercedes-Benz</option>
              <option value="Hyundai">Hyundai</option>
            </select>
          </div>

          {/* Condition Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehicle Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none transition-colors"
            >
              <option value="">Any Condition</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </div>

          {/* Price Range Filters */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Price Range ({currency === 'INR' ? '₹' : '$'})
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" 
                placeholder="Min" 
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
              <input 
                type="number" 
                placeholder="Max" 
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <button 
              onClick={fetchVehicles}
              className="w-full py-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs font-bold text-slate-300 hover:bg-slate-900 transition-colors"
            >
              Apply Price
            </button>
          </div>
        </aside>

        {/* Listings Display Grid */}
        <div className="flex-grow">
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-24 rounded-3xl border border-dashed border-slate-800 bg-slate-900/10">
              <p className="text-slate-400 text-lg">No vehicles found matching the filters.</p>
              <button onClick={clearFilters} className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700">
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div 
                  key={vehicle.id} 
                  onClick={() => onSelectVehicle(vehicle.id)}
                  className="group relative rounded-3xl bg-slate-900/40 border border-slate-800/80 p-5 backdrop-blur-md hover:border-cyan-500/50 hover:cursor-pointer transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Image block */}
                    <div className="w-full h-44 rounded-2xl overflow-hidden mb-5 bg-slate-950 relative">
                      <video 
                        src={BRAND_VIDEOS[vehicle.make.toLowerCase()] || BRAND_VIDEOS.default} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        className="absolute inset-0 w-full h-full object-cover z-10 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300 pointer-events-none" 
                      />
                      <img 
                        src={vehicle.image_url} 
                        alt={`${vehicle.make} ${vehicle.model}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-950/80 text-cyan-400 border border-cyan-500/20 uppercase">
                        {vehicle.condition}
                      </div>

                      {/* Status Badges */}
                      {vehicle.status === 'pending_escrow' && (
                        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center font-bold text-xs text-amber-400 uppercase tracking-widest">
                          Held in Escrow
                        </div>
                      )}
                      {vehicle.status === 'sold' && (
                        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center font-bold text-xs text-red-500 uppercase tracking-widest">
                          Sold
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="space-y-3 transition-opacity duration-200 group-hover:opacity-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold">{vehicle.year}</p>
                          <h4 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                            {vehicle.make} {vehicle.model}
                          </h4>
                        </div>
                        <span className="text-base font-bold text-cyan-400">{formatPrice(vehicle.price)}</span>
                      </div>

                      {/* Summary Specs */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2.5 border-t border-slate-800/40 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Mileage:</span>
                          <span className="text-slate-300 font-medium">{vehicle.mileage.toLocaleString()} mi</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Fuel:</span>
                          <span className="text-slate-300 font-medium capitalize">{vehicle.fuel_type}</span>
                        </div>
                        <div className="flex justify-between col-span-2 border-t border-slate-800/20 pt-2">
                          <span className="text-slate-500">Availability:</span>
                          <span className={`font-bold ${vehicle.stock <= 2 ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {vehicle.stock} {vehicle.stock === 1 ? 'piece' : 'pieces'} left
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seller Rating footer */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center text-xs transition-opacity duration-200 group-hover:opacity-0">
                    <span className="text-slate-400">Seller: <strong className="text-slate-300 font-semibold">{vehicle.seller_name}</strong></span>
                    <div className="flex items-center gap-1 text-amber-400 font-semibold">
                      ★ <span>{vehicle.seller_rating}</span>
                    </div>
                  </div>

                  {/* Floating pop-up specs card on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-[210px] bg-slate-950 p-5 flex flex-col justify-between pointer-events-none z-30 border border-cyan-500/30 rounded-b-3xl shadow-2xl backdrop-blur-lg invisible opacity-0 scale-95 group-hover:visible group-hover:opacity-100 group-hover:scale-100 transition-all duration-200">
                    <div>
                      <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">
                            {vehicle.year} &bull; {vehicle.condition}
                          </span>
                          <h5 className="text-base font-extrabold text-white mt-0.5 leading-tight">
                            {vehicle.make} {vehicle.model}
                          </h5>
                        </div>
                        <span className="text-sm font-black text-cyan-400 shrink-0 ml-2">{formatPrice(vehicle.price)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 py-4 text-[11px] leading-tight">
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">Mileage</p>
                          <p className="text-slate-300 font-bold">{vehicle.mileage.toLocaleString()} mi</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">Fuel Type</p>
                          <p className="text-slate-300 font-bold capitalize">{vehicle.fuel_type}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">Transmission</p>
                          <p className="text-slate-300 font-bold">{vehicle.transmission}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">Engine</p>
                          <p className="text-slate-300 font-bold">{vehicle.engine}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">Location</p>
                          <p className="text-slate-300 font-bold truncate">{vehicle.location}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">Availability</p>
                          <p className={`font-bold ${vehicle.stock <= 2 ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {vehicle.stock} {vehicle.stock === 1 ? 'piece' : 'pieces'} left
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-[11px]">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">Seller Profile</p>
                        <p className="text-slate-300 font-semibold mt-0.5">{vehicle.seller_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">Reputation</p>
                        <div className="flex items-center gap-1 text-amber-400 font-bold mt-0.5 justify-end">
                          ★ <span>{vehicle.seller_rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Showroom;
