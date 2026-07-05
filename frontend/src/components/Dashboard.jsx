import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, runTransaction, addDoc, updateDoc } from 'firebase/firestore';

function Dashboard({ currentUser, currency, formatPrice, EXCHANGE_RATE }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [listings, setListings] = useState([]);
  const [editingVehicle, setEditingVehicle] = useState(null);
  
  // Listing Form State
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('good');
  const [mileage, setMileage] = useState('');
  const [engine, setEngine] = useState('');
  const [transmission, setTransmission] = useState('Automatic');
  const [fuelType, setFuelType] = useState('Electric');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [stock, setStock] = useState('5');
  const [usageType, setUsageType] = useState('used');
  const [formMsg, setFormMsg] = useState('');

  const fetchDashboardData = async () => {
    if (!currentUser) return;

    try {
      // 1. Fetch user transactions
      const txCol = collection(db, 'transactions');
      let qTx;
      if (currentUser.role === 'buyer') {
        qTx = query(txCol, where('buyer_id', '==', currentUser.id));
      } else if (currentUser.role === 'seller') {
        qTx = query(txCol, where('seller_id', '==', currentUser.id));
      } else {
        qTx = query(txCol); // Admin sees all transactions
      }
      
      const txSnapshot = await getDocs(qTx);
      const txList = txSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      txList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setTransactions(txList);

      // 2. Fetch user listings (if seller)
      if (currentUser.role === 'seller') {
        const vehiclesCol = collection(db, 'vehicles');
        const qVehicles = query(vehiclesCol, where('seller_id', '==', currentUser.id));
        const vehiclesSnapshot = await getDocs(qVehicles);
        const vehiclesList = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        vehiclesList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setListings(vehiclesList);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  // Dynamically convert price form input value when currency toggles
  useEffect(() => {
    if (price) {
      if (currency === 'INR') {
        setPrice(Math.round(parseFloat(price) * EXCHANGE_RATE).toString());
      } else {
        setPrice(Math.round(parseFloat(price) / EXCHANGE_RATE).toString());
      }
    }
  }, [currency]);

  const handleStartEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setMake(vehicle.make);
    setModel(vehicle.model);
    setYear(vehicle.year.toString());
    setPrice(currency === 'INR' ? Math.round(vehicle.price * EXCHANGE_RATE).toString() : vehicle.price.toString());
    setCondition(vehicle.condition);
    setMileage(vehicle.mileage.toString());
    setEngine(vehicle.engine);
    setTransmission(vehicle.transmission);
    setFuelType(vehicle.fuel_type.charAt(0).toUpperCase() + vehicle.fuel_type.slice(1));
    setImageUrl(vehicle.image_url);
    setDescription(vehicle.description || '');
    setLocation(vehicle.location);
    setStock(vehicle.stock.toString());
    setUsageType(vehicle.usage_type);
    setFormMsg('');
    setActiveTab('create-listing');
  };

  const handleListVehicleSubmit = async (e) => {
    e.preventDefault();
    setFormMsg('');

    let usdPrice = parseFloat(price);
    if (currency === 'INR') {
      usdPrice = usdPrice / EXCHANGE_RATE;
    }

    try {
      const vehicleData = {
        seller_id: currentUser.id,
        seller_name: currentUser.username,
        seller_rating: currentUser.rating !== undefined ? currentUser.rating : 5.0,
        make,
        model,
        year: parseInt(year, 10),
        price: usdPrice,
        condition,
        mileage: parseInt(mileage, 10),
        engine,
        transmission,
        fuel_type: fuelType.toLowerCase(),
        image_url: imageUrl,
        description,
        location,
        stock: parseInt(stock, 10),
        usage_type: usageType,
        status: editingVehicle ? editingVehicle.status : 'available',
        created_at: editingVehicle ? editingVehicle.created_at : new Date().toISOString()
      };

      if (editingVehicle) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), vehicleData);
        setFormMsg('Vehicle listing updated successfully!');
        setEditingVehicle(null);
        setActiveTab('listings');
      } else {
        await addDoc(collection(db, 'vehicles'), vehicleData);
        setFormMsg('Vehicle listing published successfully!');
      }

      // Clear form
      setMake('');
      setModel('');
      setYear('');
      setPrice('');
      setMileage('');
      setEngine('');
      setImageUrl('');
      setDescription('');
      setLocation('');
      setStock('5');
      setUsageType('used');
      
      fetchDashboardData();
    } catch (err) {
      setFormMsg(`Error: ${err.message}`);
    }
  };

  const handleReleaseEscrow = async (txId) => {
    if (!window.confirm('Are you sure you want to release the escrow funds? Once released, this action cannot be undone.')) return;

    try {
      const txDocRef = doc(db, 'transactions', txId);
      
      await runTransaction(db, async (transaction) => {
        const txDoc = await transaction.get(txDocRef);
        if (!txDoc.exists()) {
          throw new Error('Transaction not found');
        }

        const txData = txDoc.data();
        if (txData.status !== 'escrow') {
          throw new Error('Escrow is already released or refunded');
        }

        // 1. Update transaction status
        transaction.update(txDocRef, { status: 'released' });

        // 2. Fetch the vehicle to check stock and update status
        const vehicleDocRef = doc(db, 'vehicles', txData.vehicle_id);
        const vehicleDoc = await transaction.get(vehicleDocRef);
        if (vehicleDoc.exists()) {
          const vehicleData = vehicleDoc.data();
          const newStatus = vehicleData.stock === 0 ? 'sold' : 'available';
          transaction.update(vehicleDocRef, { status: newStatus });
        }

        // 3. Create notifications
        const sellerNotifyDocRef = doc(collection(db, 'notifications'));
        transaction.set(sellerNotifyDocRef, {
          user_id: txData.seller_id,
          message: `Escrow funds of $${txData.amount.toLocaleString()} have been released to your account! Vehicle sold.`,
          is_read: 0,
          created_at: new Date().toISOString()
        });

        const buyerNotifyDocRef = doc(collection(db, 'notifications'));
        transaction.set(buyerNotifyDocRef, {
          user_id: txData.buyer_id,
          message: `You released $${txData.amount.toLocaleString()} to the seller. Thank you for your purchase!`,
          is_read: 0,
          created_at: new Date().toISOString()
        });
      });

      alert('Escrow funds successfully released to the seller.');
      fetchDashboardData();
    } catch (err) {
      alert(`Escrow release failed: ${err.message}`);
    }
  };

  return (
    <div className="w-full max-w-6xl space-y-8">
      {/* Overview stats header */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full">
            {currentUser.role} Account
          </span>
          <h2 className="text-3xl font-extrabold text-white mt-3">{currentUser.username}</h2>
          <p className="text-slate-400 text-sm mt-0.5">{currentUser.email}</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-950/60 border border-slate-800/40 rounded-2xl p-4 text-center shrink-0 min-w-28">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Reputation</p>
            <p className="text-lg font-black text-amber-400 mt-1">★ {currentUser.rating}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-900 gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'overview' ? 'border-cyan-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Transactions
        </button>
        {currentUser.role === 'seller' && (
          <>
            <button
              onClick={() => setActiveTab('listings')}
              className={`pb-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'listings' ? 'border-cyan-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              My Listings ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab('create-listing')}
              className={`pb-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'create-listing' ? 'border-cyan-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Add New Listing
            </button>
          </>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white">Transaction Logs</h3>
          
          {transactions.length === 0 ? (
            <div className="text-center py-20 rounded-3xl border border-dashed border-slate-800 bg-slate-900/10">
              <p className="text-slate-400 text-sm">No transaction records found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="rounded-3xl bg-slate-900/40 border border-slate-800/80 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-950 shrink-0">
                      <img src={tx.image_url} alt={`${tx.make} ${tx.model}`} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{tx.year} {tx.make} {tx.model}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {currentUser.role === 'buyer' ? `Seller: ${tx.seller_name}` : `Buyer: ${tx.buyer_name}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold text-right">Amount</p>
                      <p className="text-sm font-bold text-cyan-400 mt-0.5">{formatPrice(tx.amount)}</p>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tx.status === 'released' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : tx.status === 'escrow'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {tx.status}
                      </span>
                    </div>

                    {currentUser.role === 'buyer' && tx.status === 'escrow' && (
                      <button
                        onClick={() => handleReleaseEscrow(tx.id)}
                        className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors shadow-md shadow-cyan-500/5"
                      >
                        Release Escrow
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'listings' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white">Active vehicle listings</h3>
          
          {listings.length === 0 ? (
            <div className="text-center py-20 rounded-3xl border border-dashed border-slate-800 bg-slate-900/10">
              <p className="text-slate-400 text-sm">You haven't listed any vehicles yet.</p>
              <button 
                onClick={() => setActiveTab('create-listing')}
                className="mt-4 px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold"
              >
                List a Vehicle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((vehicle) => (
                <div 
                  key={vehicle.id} 
                  className="rounded-3xl bg-slate-900/40 border border-slate-800 p-5 overflow-hidden flex flex-col justify-between"
                >
                  <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 bg-slate-950">
                    <img src={vehicle.image_url} alt={vehicle.model} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-between flex-grow">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 border border-cyan-800/30 rounded-full">
                        {vehicle.status}
                      </span>
                      <h4 className="text-lg font-bold text-white mt-2">{vehicle.make} {vehicle.model}</h4>
                      <p className="text-sm font-bold text-slate-300 mt-1">{formatPrice(vehicle.price)}</p>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-semibold">{vehicle.year} &bull; {vehicle.condition}</span>
                      <button
                        onClick={() => handleStartEdit(vehicle)}
                        className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'create-listing' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-6">
          <h3 className="text-xl font-bold text-white">
            {editingVehicle ? 'Edit Second-Hand Listing' : 'Publish Second-Hand Listing'}
          </h3>
          
          {formMsg && (
            <div className={`rounded-xl p-4 text-xs font-medium border ${
              formMsg.startsWith('Error') 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}>
              {formMsg}
            </div>
          )}

          <form onSubmit={handleListVehicleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Make</label>
                <input 
                  type="text" 
                  value={make} onChange={(e) => setMake(e.target.value)} required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Tesla, Porsche, etc."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Model</label>
                <input 
                  type="text" 
                  value={model} onChange={(e) => setModel(e.target.value)} required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Model S, Cayman, etc."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Year</label>
                <input 
                  type="number" 
                  value={year} onChange={(e) => setYear(e.target.value)} required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="2022"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Price ({currency === 'INR' ? '₹' : '$'})
                </label>
                <input 
                  type="number" 
                  value={price} onChange={(e) => setPrice(e.target.value)} required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  placeholder={currency === 'INR' ? '7055000' : '85000'}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mileage (miles)</label>
                <input 
                  type="number" 
                  value={mileage} onChange={(e) => setMileage(e.target.value)} required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="12000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Condition</label>
                <select 
                  value={condition} onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vehicle Category</label>
                <select 
                  value={usageType} onChange={(e) => setUsageType(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="used">Second Hand</option>
                  <option value="new">New Vehicle</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Engine Description</label>
                <input 
                  type="text" 
                  value={engine} onChange={(e) => setEngine(e.target.value)} required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Tri-Motor Electric / 2.0L Turbo"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Transmission</label>
                <select 
                  value={transmission} onChange={(e) => setTransmission(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fuel Type</label>
                <select 
                  value={fuelType} onChange={(e) => setFuelType(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Gasoline">Gasoline</option>
                  <option value="Diesel">Diesel</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location</label>
                <input 
                  type="text" 
                  value={location} onChange={(e) => setLocation(e.target.value)} required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Seattle, WA"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Image URL</label>
                <input 
                  type="text" 
                  value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="https://images.unsplash.com/... (or copy a mock URL)"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quantity / Stock</label>
                <select 
                  value={stock} onChange={(e) => setStock(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="1">1 Unit</option>
                  <option value="2">2 Units</option>
                  <option value="3">3 Units</option>
                  <option value="4">4 Units</option>
                  <option value="5">5 Units</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
              <textarea 
                rows="4"
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                placeholder="Give details about vehicle history, autopilot, battery capacity, condition etc."
              />
            </div>

            {editingVehicle ? (
              <div className="flex gap-4">
                <button 
                  type="submit"
                  className="flex-grow py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition-all cursor-pointer"
                >
                  Save Changes
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setEditingVehicle(null);
                    setMake('');
                    setModel('');
                    setYear('');
                    setPrice('');
                    setMileage('');
                    setEngine('');
                    setImageUrl('');
                    setDescription('');
                    setLocation('');
                    setStock('5');
                    setUsageType('used');
                    setActiveTab('listings');
                  }}
                  className="px-6 py-4 rounded-2xl border border-slate-800 bg-slate-950 text-sm font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel Edit
                </button>
              </div>
            ) : (
              <button 
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition-all cursor-pointer"
              >
                Publish Listing
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
