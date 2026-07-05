import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, runTransaction, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

function VehicleDetail({ vehicleId, currentUser, onBack, onAuthPrompt, formatPrice }) {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [buyMessage, setBuyMessage] = useState('');

  const fetchVehicleDetails = async () => {
    setLoading(true);
    try {
      const vehicleDocRef = doc(db, 'vehicles', vehicleId);
      const vehicleDoc = await getDoc(vehicleDocRef);
      if (vehicleDoc.exists()) {
        const vehicleData = vehicleDoc.data();
        
        // Fetch reviews for this vehicle
        const reviewsCol = collection(db, 'reviews');
        const qReviews = query(reviewsCol, where('vehicle_id', '==', vehicleId));
        const reviewsSnapshot = await getDocs(qReviews);
        const reviewsList = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        reviewsList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setVehicle({ ...vehicleData, id: vehicleDoc.id, reviews: reviewsList });
      } else {
        setVehicle(null);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicleDetails();
  }, [vehicleId]);

  const handleBuy = async () => {
    if (!currentUser) {
      onAuthPrompt();
      return;
    }

    setBuyMessage('');
    try {
      const vehicleDocRef = doc(db, 'vehicles', vehicleId);
      
      await runTransaction(db, async (transaction) => {
        const vehicleDoc = await transaction.get(vehicleDocRef);
        if (!vehicleDoc.exists()) {
          throw new Error('Vehicle not found');
        }
        
        const vehicleData = vehicleDoc.data();
        if (vehicleData.status !== 'available' || vehicleData.stock <= 0) {
          throw new Error('Vehicle is already sold or out of stock');
        }

        const newStock = vehicleData.stock - 1;
        const newStatus = newStock === 0 ? 'pending_escrow' : 'available';

        // 1. Update vehicle stock & status
        transaction.update(vehicleDocRef, {
          stock: newStock,
          status: newStatus
        });

        // 2. Create Transaction document in 'transactions' collection
        const txDocRef = doc(collection(db, 'transactions'));
        transaction.set(txDocRef, {
          buyer_id: currentUser.id,
          buyer_name: currentUser.username,
          seller_id: vehicleData.seller_id,
          seller_name: vehicleData.seller_name || 'Seller',
          vehicle_id: vehicleId,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          image_url: vehicleData.image_url,
          amount: vehicleData.price,
          status: 'escrow',
          created_at: new Date().toISOString()
        });

        // 3. Create Notifications
        const sellerNotifyDocRef = doc(collection(db, 'notifications'));
        transaction.set(sellerNotifyDocRef, {
          user_id: vehicleData.seller_id,
          message: `Your vehicle (${vehicleData.make} ${vehicleData.model}) has a pending purchase! Funds are secured in escrow.`,
          is_read: 0,
          created_at: new Date().toISOString()
        });

        const buyerNotifyDocRef = doc(collection(db, 'notifications'));
        transaction.set(buyerNotifyDocRef, {
          user_id: currentUser.id,
          message: `Escrow payment of $${vehicleData.price.toLocaleString()} for ${vehicleData.make} ${vehicleData.model} has been initiated.`,
          is_read: 0,
          created_at: new Date().toISOString()
        });
      });

      setBuyMessage('Purchase initiated. Funds are now held in secure Escrow.');
      fetchVehicleDetails();
    } catch (err) {
      console.error(err);
      setBuyMessage(`Error: ${err.message}`);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');

    if (!currentUser) {
      onAuthPrompt();
      return;
    }

    try {
      const reviewData = {
        reviewer_id: currentUser.id,
        reviewer_name: currentUser.username,
        reviewee_id: vehicle.seller_id,
        vehicle_id: vehicleId,
        rating: parseInt(rating, 10),
        comment,
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'reviews'), reviewData);

      const qReviews = query(collection(db, 'reviews'), where('reviewee_id', '==', vehicle.seller_id));
      const reviewsSnapshot = await getDocs(qReviews);
      const reviewsList = reviewsSnapshot.docs.map(doc => doc.data());
      
      let sum = 0;
      reviewsList.forEach(r => sum += r.rating);
      const avgRating = reviewsList.length > 0 ? parseFloat((sum / reviewsList.length).toFixed(1)) : 5.0;

      const sellerDocRef = doc(db, 'users', vehicle.seller_id);
      const sellerDoc = await getDoc(sellerDocRef);
      if (sellerDoc.exists()) {
        await updateDoc(sellerDocRef, { rating: avgRating });
      }

      const qVehicles = query(collection(db, 'vehicles'), where('seller_id', '==', vehicle.seller_id));
      const vehiclesSnapshot = await getDocs(qVehicles);
      for (const vehicleDoc of vehiclesSnapshot.docs) {
        await updateDoc(doc(db, 'vehicles', vehicleDoc.id), { seller_rating: avgRating });
      }

      await addDoc(collection(db, 'notifications'), {
        user_id: vehicle.seller_id,
        message: `You received a new rating of ${rating} stars!`,
        is_read: 0,
        created_at: new Date().toISOString()
      });

      setReviewSuccess('Thank you! Your review has been added.');
      setComment('');
      setRating(5);
      fetchVehicleDetails();
    } catch (err) {
      setReviewError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;

    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      onBack();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40 w-full max-w-6xl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-20 w-full max-w-6xl">
        <p className="text-slate-400">Vehicle not found.</p>
        <button onClick={onBack} className="mt-4 px-6 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-sm font-semibold">
          Back to Showroom
        </button>
      </div>
    );
  }

  const isOwner = currentUser && (currentUser.id === vehicle.seller_id || currentUser.role === 'admin');

  return (
    <div className="w-full max-w-6xl space-y-8">
      {/* Back link */}
      <button 
        onClick={onBack} 
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
      >
        ← Back to Showroom
      </button>

      {/* Main Info Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Image and Description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="w-full h-96 md:h-[450px] rounded-3xl overflow-hidden bg-slate-950 border border-slate-800">
            <img 
              src={vehicle.image_url} 
              alt={`${vehicle.make} ${vehicle.model}`} 
              className="w-full h-full object-cover" 
            />
          </div>

          <div className="rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8 space-y-4">
            <h3 className="text-xl font-bold text-white">Seller's Description</h3>
            <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">
              {vehicle.description || 'No description provided.'}
            </p>
          </div>
        </div>

        {/* Right Column: Title, Specs, Escrow, and Action */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-6">
            <div>
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full">
                {vehicle.condition}
              </span>
              <h2 className="text-3xl font-extrabold text-white mt-3 leading-tight">
                {vehicle.make} {vehicle.model}
              </h2>
              <p className="text-slate-400 text-sm mt-1">Year: {vehicle.year} &bull; Loc: {vehicle.location}</p>
            </div>

            <div className="flex justify-between items-center py-4 border-y border-slate-800/60">
              <span className="text-slate-400 text-sm">Asking Price</span>
              <span className="text-3xl font-black text-cyan-400">{formatPrice(vehicle.price)}</span>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/60 border border-slate-800/40 rounded-xl p-3">
                <p className="text-slate-500 uppercase font-semibold">Mileage</p>
                <p className="text-slate-300 font-bold mt-1 text-sm">{vehicle.mileage.toLocaleString()} miles</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/40 rounded-xl p-3">
                <p className="text-slate-500 uppercase font-semibold">Fuel Type</p>
                <p className="text-slate-300 font-bold mt-1 text-sm capitalize">{vehicle.fuel_type}</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/40 rounded-xl p-3">
                <p className="text-slate-500 uppercase font-semibold">Transmission</p>
                <p className="text-slate-300 font-bold mt-1 text-sm">{vehicle.transmission}</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/40 rounded-xl p-3">
                <p className="text-slate-500 uppercase font-semibold">Engine</p>
                <p className="text-slate-300 font-bold mt-1 text-sm">{vehicle.engine}</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/40 rounded-xl p-3 col-span-2">
                <p className="text-slate-500 uppercase font-semibold">Availability</p>
                <p className={`font-bold mt-1 text-sm ${vehicle.stock <= 2 ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {vehicle.stock} {vehicle.stock === 1 ? 'piece' : 'pieces'} left in stock
                </p>
              </div>
            </div>

            {/* Action Box */}
            <div className="pt-2">
              {buyMessage && (
                <div className="mb-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3.5 text-xs text-cyan-400">
                  {buyMessage}
                </div>
              )}

              {vehicle.status === 'available' && vehicle.stock > 0 ? (
                currentUser && currentUser.role === 'seller' ? (
                  <p className="text-slate-500 text-xs text-center font-medium">
                    Log in as a Buyer to initiate escrow.
                  </p>
                ) : (
                  <>
                    <button 
                      onClick={handleBuy}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition-all"
                    >
                      Buy Now (Secure Escrow)
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mt-2">
                      Secure escrow transaction for 1 unit. {vehicle.stock} units available.
                    </p>
                  </>
                )
              ) : vehicle.status === 'pending_escrow' ? (
                <div className="w-full text-center py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 font-bold text-xs text-amber-400 uppercase tracking-wider">
                  Held in secure Escrow
                </div>
              ) : (
                <div className="w-full text-center py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 font-bold text-xs text-red-500 uppercase tracking-wider">
                  Sold Out
                </div>
              )}

              {isOwner && (
                <button 
                  onClick={handleDelete}
                  className="w-full mt-3 py-3 rounded-xl border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/15 text-xs font-semibold transition-colors"
                >
                  Delete Listing
                </button>
              )}
            </div>
          </div>

          {/* Seller details card */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 space-y-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Seller Profile</h4>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-white">{vehicle.seller_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{vehicle.seller_email}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-400 font-semibold text-sm">
                  ★ <span>{vehicle.seller_rating}</span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Reputation</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Review list */}
        <div className="lg:col-span-2 rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8 space-y-6">
          <h3 className="text-xl font-bold text-white">Ratings & Reviews ({vehicle.reviews.length})</h3>

          {vehicle.reviews.length === 0 ? (
            <p className="text-slate-500 text-sm">No reviews posted yet for this listing or seller.</p>
          ) : (
            <div className="space-y-4 divide-y divide-slate-800/50">
              {vehicle.reviews.map((rev) => (
                <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-bold text-white">{rev.reviewer_name}</span>
                      <span className="text-[10px] text-slate-500 ml-2">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-amber-400">{'★'.repeat(rev.rating)}</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Review box */}
        <div>
          {currentUser ? (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-4">
              <h4 className="text-lg font-bold text-white">Rate Seller & Vehicle</h4>
              
              {reviewError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                  {reviewError}
                </div>
              )}
              {reviewSuccess && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-400">
                  {reviewSuccess}
                </div>
              )}

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rating</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="5">★★★★★ (5 - Excellent)</option>
                    <option value="4">★★★★☆ (4 - Very Good)</option>
                    <option value="3">★★★☆☆ (3 - Average)</option>
                    <option value="2">★★☆☆☆ (2 - Fair)</option>
                    <option value="1">★☆☆☆☆ (1 - Poor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Comments</label>
                  <textarea
                    rows="3"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    placeholder="Describe your purchase experience or vehicle condition..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-xs font-semibold transition-colors"
                >
                  Submit Feedback
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-8 text-center space-y-3">
              <p className="text-slate-400 text-xs">Log in to leave a review and rate the seller.</p>
              <button 
                onClick={onAuthPrompt}
                className="w-full py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-cyan-400 hover:border-slate-700"
              >
                Log In / Register
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VehicleDetail;
