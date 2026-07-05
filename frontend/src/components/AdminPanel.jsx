import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';

function AdminPanel({ currentUser, formatPrice }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setLoading(true);
    try {
      // 1. Fetch Users
      const usersCol = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCol);
      const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      usersList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setUsers(usersList);

      // 2. Fetch Vehicles
      const vehiclesCol = collection(db, 'vehicles');
      const vehiclesSnapshot = await getDocs(vehiclesCol);
      const vehiclesList = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 3. Fetch Transactions
      const txCol = collection(db, 'transactions');
      const txSnapshot = await getDocs(txCol);
      const txList = txSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      txList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Calculate stats
      const usersCount = usersList.length;
      const vehiclesCount = vehiclesList.length;
      const soldCount = vehiclesList.filter(v => v.status === 'sold').length;
      
      let escrowBalance = 0;
      txList.forEach(tx => {
        if (tx.status === 'escrow') {
          escrowBalance += tx.amount;
        }
      });

      setStats({
        usersCount,
        vehiclesCount,
        soldCount,
        escrowBalance,
        recentTransactions: txList.slice(0, 10)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser]);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This will also cascade delete all their listed vehicles, reviews, and transaction records!')) return;

    try {
      const batch = writeBatch(db);

      // 1. Delete user doc
      batch.delete(doc(db, 'users', userId));

      // 2. Query and delete vehicles by seller_id
      const qVehicles = query(collection(db, 'vehicles'), where('seller_id', '==', userId));
      const vehiclesSnapshot = await getDocs(qVehicles);
      vehiclesSnapshot.docs.forEach(d => batch.delete(d.ref));

      // 3. Query and delete reviews by reviewer_id
      const qReviewsRev = query(collection(db, 'reviews'), where('reviewer_id', '==', userId));
      const reviewsSnapshotRev = await getDocs(qReviewsRev);
      reviewsSnapshotRev.docs.forEach(d => batch.delete(d.ref));

      // 4. Query and delete reviews by reviewee_id
      const qReviewsRee = query(collection(db, 'reviews'), where('reviewee_id', '==', userId));
      const reviewsSnapshotRee = await getDocs(qReviewsRee);
      reviewsSnapshotRee.docs.forEach(d => batch.delete(d.ref));

      // 5. Query and delete transactions by buyer_id
      const qTxBuyer = query(collection(db, 'transactions'), where('buyer_id', '==', userId));
      const txSnapshotBuyer = await getDocs(qTxBuyer);
      txSnapshotBuyer.docs.forEach(d => batch.delete(d.ref));

      // 6. Query and delete transactions by seller_id
      const qTxSeller = query(collection(db, 'transactions'), where('seller_id', '==', userId));
      const txSnapshotSeller = await getDocs(qTxSeller);
      txSnapshotSeller.docs.forEach(d => batch.delete(d.ref));

      // 7. Query and delete notifications by user_id
      const qNotifications = query(collection(db, 'notifications'), where('user_id', '==', userId));
      const notificationsSnapshot = await getDocs(qNotifications);
      notificationsSnapshot.docs.forEach(d => batch.delete(d.ref));

      // Commit batch
      await batch.commit();

      alert('User and all associated data deleted successfully');
      fetchAdminData();
    } catch (err) {
      alert(`Failed to delete user: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40 w-full max-w-6xl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">AWS Administrator Control Panel</h2>
        <p className="text-slate-400 text-sm mt-1">Platform analytics, escrow balances, user management, and compliance checks.</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Users</p>
            <p className="text-3xl font-black text-white">{stats.usersCount}</p>
          </div>
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Listed Vehicles</p>
            <p className="text-3xl font-black text-white">{stats.vehiclesCount}</p>
          </div>
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Sales</p>
            <p className="text-3xl font-black text-green-400">{stats.soldCount}</p>
          </div>
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Secured Escrow Balance</p>
            <p className="text-3xl font-black text-cyan-400">{formatPrice(stats.escrowBalance)}</p>
          </div>
        </div>
      )}

      {/* Main Grid: User Management and Transaction Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management */}
        <div className="lg:col-span-2 rounded-3xl bg-slate-900/40 border border-slate-800 p-8 space-y-6 overflow-x-auto">
          <h3 className="text-xl font-bold text-white">Registered Accounts</h3>
          
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase font-semibold">
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {users.map((u) => (
                <tr key={u.id} className="text-slate-300">
                  <td className="py-3 px-4 font-bold text-white">{u.username}</td>
                  <td className="py-3 px-4">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                      u.role === 'admin' 
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                        : u.role === 'seller' 
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-amber-400 font-medium">★ {u.rating}</td>
                  <td className="py-3 px-4 text-center">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="px-3 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-bold transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Transactions List */}
        {stats && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-6">
            <h3 className="text-xl font-bold text-white">Escrow Transactions</h3>
            
            {stats.recentTransactions.length === 0 ? (
              <p className="text-slate-500 text-sm">No transaction history found.</p>
            ) : (
              <div className="space-y-4">
                {stats.recentTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">{tx.year} {tx.make} {tx.model}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                        tx.status === 'released' 
                          ? 'bg-green-500/10 text-green-400' 
                          : tx.status === 'escrow'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-red-500/10 text-red-400'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Buyer: {tx.buyer_name} &bull; Seller: {tx.seller_name}</span>
                      <span className="font-bold text-cyan-400 text-xs">{formatPrice(tx.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
