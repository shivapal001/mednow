/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  ShoppingCart, 
  User, 
  PlusCircle, 
  MessageSquare, 
  Stethoscope, 
  Bell, 
  Wallet,
  ArrowLeft,
  Menu,
  X,
  ChevronRight,
  Camera,
  Upload,
  Clock,
  Trash2,
  Send,
  FileText,
  Star,
  CheckCircle,
  Settings,
  Package,
  Users,
  MapPin,
  CreditCard,
  Truck,
  Phone,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, googleProvider } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged,
  updateProfile,
  signOut,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, orderBy, updateDoc, onSnapshot } from 'firebase/firestore';
import { MEDICINES as INITIAL_MEDICINES, DOCTORS as INITIAL_DOCTORS } from './constants';
import { User as UserType, CartItem, Medicine, Reminder, Prescription, Doctor, Order } from './types';
import { geminiService } from './services/geminiService';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Navbar = ({ cartCount, user }: { cartCount: number, user: UserType | null }) => {
  const location = useLocation();
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Shop', path: '/shop' },
    { icon: Stethoscope, label: 'Doctors', path: '/doctors' },
    { icon: MessageSquare, label: 'AI Health', path: '/ai-assistant' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  if (user?.role === 'admin') {
    navItems.splice(4, 0, { icon: Settings, label: 'Admin', path: '/admin' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 nav-blur px-6 py-4 z-50 md:top-0 md:bottom-auto md:border-b md:border-t-0 shadow-2xl shadow-slate-900/5 overflow-hidden group/nav">
      <div className="absolute inset-0 shimmer opacity-0 group-hover/nav:opacity-5 transition-opacity pointer-events-none" />
      <div className="max-w-screen-xl mx-auto flex justify-between items-center relative z-10">
        <div className="hidden md:flex items-center gap-3 font-display font-bold text-2xl tracking-tighter group cursor-pointer">
          <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-600/20 group-hover:rotate-12 transition-transform">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="gradient-text">MedNow</span>
        </div>
        <div className="flex justify-around w-full md:w-auto md:gap-12">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-all duration-500 relative group",
                  isActive ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <div className={cn(
                  "p-2 rounded-2xl transition-all duration-500",
                  isActive ? "bg-brand-50 shadow-inner" : "group-hover:bg-slate-50"
                )}>
                  <item.icon className={cn("w-5 h-5 transition-transform duration-500", isActive && "scale-110")} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="nav-active"
                    className="absolute -bottom-2 w-1 h-1 bg-brand-600 rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </div>
        <Link to="/cart" className="relative p-2.5 bg-slate-50 rounded-2xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all group">
          <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {cartCount > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-brand-600 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
            >
              {cartCount}
            </motion.span>
          )}
        </Link>
      </div>
    </nav>
  );
};

const AdminPanel = ({ user }: { user: UserType | null }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'medicines' | 'doctors' | 'orders' | 'users'>('dashboard');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newMed, setNewMed] = useState<Partial<Medicine>>({});
  const [newDoc, setNewDoc] = useState<Partial<Doctor>>({});

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const unsubMeds = onSnapshot(collection(db, 'medicines'), (snapshot) => {
      setMedicines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine)));
    });
    const unsubDocs = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      setDoctors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor)));
    });
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('created_at', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserType)));
    });

    return () => {
      unsubMeds();
      unsubDocs();
      unsubOrders();
      unsubUsers();
    };
  }, [user]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel p-12 text-center space-y-6 max-w-md">
          <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-red-500">
            <X className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-500">You do not have permission to view this page.</p>
          <Link to="/" className="btn-primary inline-block px-8 py-4">Go Home</Link>
        </div>
      </div>
    );
  }

  const handleAddMed = async () => {
    if (!newMed.name || !newMed.price) return;
    setLoading(true);
    await addDoc(collection(db, 'medicines'), {
      ...newMed,
      id: Date.now().toString(), // Simple ID generation
    });
    setNewMed({});
    setLoading(false);
  };

  const handleAddDoc = async () => {
    if (!newDoc.name || !newDoc.specialty) return;
    setLoading(true);
    await addDoc(collection(db, 'doctors'), {
      ...newDoc,
      id: Date.now().toString(),
      verified: true,
      rating: 4.5
    });
    setNewDoc({});
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await updateDoc(doc(db, 'orders', orderId), { status });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 p-2 rounded-xl text-white">
            <Settings className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-xl">Admin Panel</h2>
        </div>
        <nav className="space-y-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'medicines', icon: Package, label: 'Medicines' },
            { id: 'doctors', icon: Stethoscope, label: 'Doctors' },
            { id: 'orders', icon: ShoppingCart, label: 'Orders' },
            { id: 'users', icon: Users, label: 'Users' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                activeTab === item.id ? "bg-brand-50 text-brand-600 shadow-sm" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-display font-bold">Dashboard Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Orders', value: orders.length, icon: ShoppingCart, color: 'bg-blue-500' },
                { label: 'Total Users', value: users.length, icon: Users, color: 'bg-emerald-500' },
                { label: 'Medicines', value: medicines.length, icon: Package, color: 'bg-orange-500' },
                { label: 'Doctors', value: doctors.length, icon: Stethoscope, color: 'bg-brand-600' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className={cn(stat.color, "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg")}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-3xl font-display font-bold text-slate-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'medicines' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-display font-bold">Manage Medicines</h1>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-bold text-lg">Add New Medicine</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  className="input-field" 
                  placeholder="Medicine Name" 
                  value={newMed.name || ''} 
                  onChange={e => setNewMed({...newMed, name: e.target.value})} 
                />
                <input 
                  className="input-field" 
                  placeholder="Brand" 
                  value={newMed.brand || ''} 
                  onChange={e => setNewMed({...newMed, brand: e.target.value})} 
                />
                <input 
                  className="input-field" 
                  placeholder="Price" 
                  type="number"
                  value={newMed.price || ''} 
                  onChange={e => setNewMed({...newMed, price: Number(e.target.value)})} 
                />
                <input 
                  className="input-field" 
                  placeholder="Category" 
                  value={newMed.category || ''} 
                  onChange={e => setNewMed({...newMed, category: e.target.value})} 
                />
                <input 
                  className="input-field md:col-span-2" 
                  placeholder="Image URL" 
                  value={newMed.image || ''} 
                  onChange={e => setNewMed({...newMed, image: e.target.value})} 
                />
                <textarea 
                  className="input-field md:col-span-2 min-h-[100px]" 
                  placeholder="Description" 
                  value={newMed.description || ''} 
                  onChange={e => setNewMed({...newMed, description: e.target.value})} 
                />
              </div>
              <button onClick={handleAddMed} disabled={loading} className="btn-primary px-12 py-4">
                {loading ? 'Saving...' : 'Add Medicine'}
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Medicine</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Price</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines.map(med => (
                    <tr key={med.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={med.image} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <p className="font-bold text-slate-800">{med.name}</p>
                            <p className="text-xs text-slate-400">{med.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{med.category}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">₹{med.price}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => deleteDoc(doc(db, 'medicines', med.id))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'doctors' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-display font-bold">Manage Doctors</h1>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-bold text-lg">Add New Doctor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  className="input-field" 
                  placeholder="Doctor Name" 
                  value={newDoc.name || ''} 
                  onChange={e => setNewDoc({...newDoc, name: e.target.value})} 
                />
                <input 
                  className="input-field" 
                  placeholder="Specialty" 
                  value={newDoc.specialty || ''} 
                  onChange={e => setNewDoc({...newDoc, specialty: e.target.value})} 
                />
                <input 
                  className="input-field" 
                  placeholder="Experience (e.g. 10 years)" 
                  value={newDoc.experience || ''} 
                  onChange={e => setNewDoc({...newDoc, experience: e.target.value})} 
                />
                <input 
                  className="input-field" 
                  placeholder="Consultation Fee" 
                  type="number"
                  value={newDoc.fee || ''} 
                  onChange={e => setNewDoc({...newDoc, fee: Number(e.target.value)})} 
                />
                <input 
                  className="input-field" 
                  placeholder="WhatsApp Number" 
                  value={newDoc.whatsapp || ''} 
                  onChange={e => setNewDoc({...newDoc, whatsapp: e.target.value})} 
                />
                <input 
                  className="input-field" 
                  placeholder="Image URL" 
                  value={newDoc.image || ''} 
                  onChange={e => setNewDoc({...newDoc, image: e.target.value})} 
                />
              </div>
              <button onClick={handleAddDoc} disabled={loading} className="btn-primary px-12 py-4">
                {loading ? 'Saving...' : 'Add Doctor'}
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Doctor</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Specialty</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">WhatsApp</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map(docItem => (
                    <tr key={docItem.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={docItem.image} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <p className="font-bold text-slate-800">{docItem.name}</p>
                            <p className="text-xs text-slate-400">{docItem.experience}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{docItem.specialty}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{docItem.whatsapp || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => deleteDoc(doc(db, 'doctors', docItem.id))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-display font-bold">Manage Orders</h1>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Order ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Total</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#{order.id.slice(-6)}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{order.user_name || 'Anonymous'}</p>
                        <p className="text-xs text-slate-400">{order.user_phone}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">₹{order.total_amount}</td>
                      <td className="px-6 py-4">
                        <select 
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className={cn(
                            "text-xs font-bold px-3 py-1.5 rounded-full border-none outline-none",
                            order.status === 'pending' ? "bg-orange-50 text-orange-600" :
                            order.status === 'delivered' ? "bg-emerald-50 text-emerald-600" :
                            "bg-blue-50 text-blue-600"
                          )}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{order.paymentMethod}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const HomePage = ({ medicines }: { medicines: Medicine[] }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-16 pb-24 pt-10 px-6 max-w-screen-xl mx-auto"
    >
      {/* Editorial Hero Section */}
      <header className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white shadow-sm">
            <div className="w-2 h-2 bg-brand-600 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Available 24/7</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-display font-bold text-slate-900 tracking-tighter leading-[0.85]">
            Your Health, <br />
            <span className="gradient-text italic">Redefined.</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-md leading-relaxed">
            Experience the future of healthcare with AI-powered diagnostics, instant consultations, and smart wellness management.
          </p>
          <div className="flex flex-wrap gap-6 pt-4">
            <Link to="/shop" className="btn-primary px-10 py-5 text-lg shadow-2xl shadow-brand-600/20">Start Shopping</Link>
            <Link to="/ai-assistant" className="glass-panel px-10 py-5 text-lg font-bold text-slate-700 hover:bg-white/80 transition-all">Talk to AI</Link>
          </div>
        </div>
        <div className="hidden lg:block relative floating">
          <div className="absolute inset-0 bg-brand-600/10 rounded-[4rem] blur-3xl -z-10 animate-pulse" />
          <img 
            src="https://picsum.photos/seed/healthcare/800/600" 
            alt="Healthcare" 
            className="rounded-[4rem] shadow-2xl border-8 border-white rotate-3 hover:rotate-0 transition-transform duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-6 -left-6 glass-card p-6 flex items-center gap-4 animate-bounce [animation-duration:4s]">
            <div className="bg-brand-500 p-3 rounded-2xl text-white">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Users</p>
              <p className="text-xl font-display font-bold text-slate-900">12.4k+</p>
            </div>
          </div>
        </div>
      </header>

      {/* Bento Grid Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Link to="/upload" className="md:col-span-2 glass-panel p-12 flex flex-col md:flex-row items-center gap-10 card-hover border-white/80 group relative overflow-hidden">
          <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
          <div className="bg-emerald-500 p-8 rounded-[3rem] text-white shadow-2xl shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
            <Camera className="w-12 h-12" />
          </div>
          <div className="space-y-3 text-center md:text-left">
            <h3 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Scan Prescription</h3>
            <p className="text-slate-500 font-medium max-w-xs leading-relaxed">Upload your prescription and let our AI handle the rest instantly.</p>
          </div>
        </Link>
        <Link to="/reminders" className="bg-slate-900 p-12 rounded-[3rem] text-white space-y-8 card-hover shadow-2xl shadow-slate-900/20 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/20 transition-colors" />
          <div className="bg-orange-500 p-5 rounded-2xl w-fit group-hover:rotate-12 transition-transform shadow-xl shadow-orange-500/20">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-display font-bold tracking-tight">Smart Reminders</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">Never miss a dose again with AI-scheduled alerts.</p>
          </div>
        </Link>
        <Link to="/doctors" className="md:col-span-3 glass-panel p-12 flex flex-col md:flex-row items-center justify-between gap-10 card-hover border-white/80 group relative overflow-hidden">
          <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="bg-brand-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-brand-600/20 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700">
              <Stethoscope className="w-12 h-12" />
            </div>
            <div className="space-y-3 text-center md:text-left">
              <h3 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Expert Consultation</h3>
              <p className="text-slate-500 font-medium max-w-md leading-relaxed">Connect with top-rated specialists for instant video consultations and expert medical advice.</p>
            </div>
          </div>
          <div className="flex -space-x-4 group-hover:space-x-1 transition-all duration-500">
            {[1, 2, 3, 4].map((i) => (
              <img 
                key={i}
                src={`https://picsum.photos/seed/doc${i}/100/100`} 
                alt="Doctor" 
                className="w-14 h-14 rounded-2xl border-4 border-white shadow-lg object-cover"
                referrerPolicy="no-referrer"
              />
            ))}
            <div className="w-14 h-14 rounded-2xl border-4 border-white shadow-lg bg-slate-50 flex items-center justify-center text-slate-400 text-xs font-bold">
              +12
            </div>
          </div>
        </Link>
      </section>

      {/* Featured Medicines - Horizontal Scroll with better styling */}
      <section className="space-y-10">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold font-display tracking-tight text-slate-900">Essentials</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">Curated for your daily wellness</p>
          </div>
          <Link to="/shop" className="text-brand-600 text-sm font-bold hover:underline underline-offset-8 decoration-2 transition-all">View Full Store</Link>
        </div>
        <div className="flex gap-8 overflow-x-auto pb-12 no-scrollbar -mx-6 px-6">
          {medicines.slice(0, 5).map((med) => (
            <motion.div 
              whileHover={{ y: -15 }}
              key={med.id} 
              className="min-w-[280px] glass-panel p-8 space-y-6 border-white/60 group relative overflow-hidden"
            >
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
              <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-50 shadow-inner">
                <img src={med.image} alt={med.name} className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-1000" referrerPolicy="no-referrer" />
                <div className="absolute top-4 right-4">
                  <span className="bg-white/90 backdrop-blur-md text-[9px] font-bold px-4 py-2 rounded-full text-brand-600 shadow-sm uppercase tracking-widest">
                    {med.category}
                  </span>
                </div>
              </div>
              <div className="space-y-1 px-1">
                <h4 className="font-bold text-lg text-slate-800 line-clamp-1 group-hover:text-brand-600 transition-colors">{med.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{med.brand}</p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</span>
                  <span className="font-bold text-2xl text-slate-900">₹{med.price}</span>
                </div>
                <button className="bg-brand-600 text-white p-4 rounded-2xl hover:bg-brand-700 transition-all shadow-xl shadow-brand-600/20 active:scale-90">
                  <PlusCircle className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};

const DoctorsPage = ({ doctors }: { doctors: Doctor[] }) => {
  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-10 pb-24 pt-10">
      <header className="space-y-2">
        <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Expert <span className="gradient-text italic">Consultation</span></h2>
        <p className="text-slate-500 font-medium">Connect with top specialists instantly via WhatsApp.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {doctors.map((doc) => (
          <motion.div 
            whileHover={{ y: -10 }}
            key={doc.id} 
            className="glass-panel p-8 space-y-6 border-white/60 group hover:shadow-2xl transition-all duration-700 relative overflow-hidden"
          >
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
            
            <div className="flex items-start justify-between">
              <div className="relative">
                <img 
                  src={doc.image} 
                  alt={doc.name} 
                  className="w-24 h-24 rounded-[2.5rem] object-cover border-4 border-white shadow-xl group-hover:scale-105 transition-transform duration-700" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute -bottom-2 -right-2 bg-brand-600 text-white p-2.5 rounded-2xl border-4 border-white shadow-lg">
                  <Stethoscope className="w-5 h-5" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {doc.verified && (
                  <div className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest border border-emerald-100/50 flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-100/50">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-bold text-yellow-700">{doc.rating}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-2xl text-slate-900 group-hover:text-brand-600 transition-colors">{doc.name}</h4>
              </div>
              <p className="text-brand-600 text-xs font-bold uppercase tracking-[0.2em]">{doc.specialty}</p>
              <div className="flex items-center gap-3 pt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Experience</span>
                  <span className="text-sm font-bold text-slate-700">{doc.experience}</span>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patients</span>
                  <span className="text-sm font-bold text-slate-700">2.5k+</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultation Fee</span>
                <span className="font-bold text-2xl text-slate-900">₹{doc.fee}</span>
              </div>
              <a 
                href={`https://wa.me/${doc.whatsapp || '910000000000'}?text=Hello Dr. ${doc.name}, I would like to book a consultation.`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                WhatsApp
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ShopPage = ({ addToCart, medicines }: { addToCart: (m: Medicine) => void, medicines: Medicine[] }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  
  const categories = ['All', 'Fever', 'Pain', 'Digestive', 'Cold', 'Vitamins'];
  
  const filtered = medicines.filter(m => 
    (category === 'All' || m.category === category) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || m.brand.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-10 pb-24 pt-10">
      <header className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Pharmacy <span className="gradient-text italic">Store</span></h2>
          <p className="text-slate-500 font-medium">Genuine medicines delivered in 15 minutes.</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search medicines, brands, or symptoms..." 
              className="input-field py-4 pl-14"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 whitespace-nowrap border",
                  category === cat 
                    ? "bg-brand-600 text-white border-brand-600 shadow-xl shadow-brand-600/20" 
                    : "bg-white text-slate-400 border-slate-100 hover:border-brand-200 hover:text-slate-600"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filtered.map((med) => (
          <motion.div 
            layout
            key={med.id} 
            className="bg-white p-6 rounded-[3rem] border border-slate-100 space-y-5 shadow-sm hover:shadow-premium transition-all duration-700 group relative overflow-hidden"
          >
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-50">
              <img 
                src={med.image} 
                alt={med.name} 
                className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-1000" 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-md text-[9px] font-bold px-4 py-2 rounded-full text-brand-600 shadow-sm uppercase tracking-widest">
                  {med.category}
                </span>
              </div>
            </div>
            <div className="space-y-1 px-1">
              <h4 className="font-bold text-lg text-slate-800 line-clamp-1 group-hover:text-brand-600 transition-colors">{med.name}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{med.brand}</p>
              <p className="text-xs text-slate-500 line-clamp-2 pt-2 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">{med.description}</p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</span>
                <span className="font-bold text-2xl text-slate-900">₹{med.price}</span>
              </div>
              <button 
                onClick={() => addToCart(med)}
                className="bg-brand-600 text-white p-4 rounded-2xl font-bold text-sm hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/20 active:scale-95"
              >
                <PlusCircle className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-8 h-8 text-slate-200" />
          </div>
          <p className="text-slate-400 font-medium">No medicines found matching your search.</p>
        </div>
      )}
    </div>
  );
};

const AIAssistantPage = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: "Hi! I'm MedNow AI. How can I help you with your health today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await geminiService.getHealthAdvice(userMsg, []);
      setMessages(prev => [...prev, { role: 'bot', text: response || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: "Error connecting to AI service." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-screen-md mx-auto p-4 pt-10">
      <div className="flex-1 overflow-y-auto space-y-8 pb-10 no-scrollbar px-2">
        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            key={i} 
            className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}
          >
            <div className={cn(
              "max-w-[85%] p-6 rounded-[2.5rem] text-sm leading-relaxed shadow-premium relative group",
              msg.role === 'user' 
                ? "bg-brand-600 text-white rounded-tr-none shadow-brand-600/20" 
                : "glass-panel rounded-tl-none text-slate-700"
            )}>
              {msg.text}
              <div className={cn(
                "absolute top-4 w-2 h-2 rounded-full",
                msg.role === 'user' ? "-right-1 bg-brand-600" : "-left-1 bg-white border border-slate-100"
              )} />
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass-panel p-6 rounded-[2rem] rounded-tl-none">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 glass-panel rounded-[3rem] flex gap-3 shadow-2xl shadow-slate-900/5 relative overflow-hidden group">
        <div className="absolute inset-0 shimmer opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
        <input 
          type="text" 
          placeholder="Ask about symptoms, medicines..." 
          className="flex-1 outline-none text-sm px-6 bg-transparent font-bold placeholder:text-slate-400"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          className="bg-brand-600 text-white p-4 rounded-[2rem] hover:bg-brand-700 disabled:opacity-50 transition-all shadow-xl shadow-brand-600/20 active:scale-90"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const UploadPage = ({ user }: { user: UserType | null }) => {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const navigate = useNavigate();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startScan = async () => {
    if (!image || !user) return;
    setScanning(true);
    try {
      const data = await geminiService.scanPrescription(image);
      setResult(data);
      // Save to Firestore
      await addDoc(collection(db, 'prescriptions'), {
        user_id: user.id,
        image_url: image,
        extracted_data: JSON.stringify(data),
        created_at: new Date().toISOString()
      });
    } catch (err) {
      alert("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="p-6 max-w-screen-md mx-auto space-y-10 pb-24 pt-10">
      <header className="text-center space-y-3">
        <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900">Upload <span className="gradient-text italic">Prescription</span></h1>
        <p className="text-slate-500 font-medium">AI-powered extraction for instant health management.</p>
      </header>

      {!image ? (
        <motion.label 
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          className="glass-panel p-20 flex flex-col items-center gap-8 cursor-pointer hover:border-brand-500/30 hover:bg-white/60 transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
          <div className="bg-slate-50 p-8 rounded-[2.5rem] group-hover:bg-brand-100 transition-all duration-500 group-hover:rotate-6 shadow-inner">
            <Upload className="w-16 h-16 text-slate-300 group-hover:text-brand-600 transition-colors" />
          </div>
          <div className="text-center space-y-2">
            <span className="block text-xl font-bold text-slate-800">Drop your prescription here</span>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em]">JPG, PNG • Max 10MB</span>
          </div>
          <input type="file" className="hidden" accept="image/*" onChange={handleFile} />
        </motion.label>
      ) : (
        <div className="space-y-10">
          <div className="relative rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl floating">
            <img src={image} alt="Prescription" className="w-full h-96 object-cover" />
            <button 
              onClick={() => setImage(null)}
              className="absolute top-6 right-6 bg-white/90 backdrop-blur p-4 rounded-2xl text-red-500 shadow-xl hover:bg-red-50 transition-all active:scale-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {!result ? (
            <button 
              onClick={startScan}
              disabled={scanning}
              className="w-full btn-primary py-6 text-xl shadow-2xl shadow-brand-600/30"
            >
              {scanning ? (
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>AI is scanning...</span>
                </div>
              ) : (
                <>
                  <Camera className="w-6 h-6" />
                  <span>Start AI Extraction</span>
                </>
              )}
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-10 space-y-8 relative overflow-hidden group"
            >
              <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
              <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                <div className="space-y-1">
                  <h3 className="font-bold text-2xl tracking-tight">Extracted Details</h3>
                  <p className="text-slate-400 text-xs font-medium">Verified by MedNow AI</p>
                </div>
                <div className="bg-brand-500 p-2 rounded-xl text-white shadow-lg shadow-brand-500/20">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-6">
                {result.medicines?.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-4 rounded-2xl hover:bg-slate-50/50 transition-all group/item border border-transparent hover:border-slate-100">
                    <div className="space-y-1">
                      <p className="font-bold text-lg text-slate-800 group-hover/item:text-brand-600 transition-colors">{m.name}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.dosage}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className="text-xs italic text-slate-400 font-medium">{m.instructions}</span>
                      </div>
                    </div>
                    <button className="bg-brand-600 text-white p-3 rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/20 active:scale-90">
                      <PlusCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="pt-8 flex gap-4">
                <button onClick={() => navigate('/shop')} className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-2xl font-bold hover:bg-slate-200 transition-all">Shop More</button>
                <button onClick={() => navigate('/wallet')} className="flex-1 btn-primary py-5 shadow-xl shadow-brand-600/20">Save to Wallet</button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

const CartPage = ({ cart, updateQty, clearCart, user }: { cart: CartItem[], updateQty: (id: string, q: number) => void, clearCart: () => void, user: UserType | null }) => {
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      }, (err) => {
        alert("Could not get location. Please enter address manually.");
      });
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }
    if (!address) {
      alert("Please enter delivery address");
      return;
    }
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'orders'), {
        user_id: user.id,
        user_name: user.name,
        user_phone: user.phone,
        items: JSON.stringify(cart),
        total_amount: total,
        status: 'pending',
        paymentMethod,
        address,
        location,
        created_at: new Date().toISOString()
      });
      clearCart();
      alert("Order placed successfully!");
      navigate('/');
    } catch (err) {
      console.error(err);
      alert("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-screen-md mx-auto space-y-10 pb-24 pt-10">
      <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900">Your <span className="gradient-text italic">Cart</span></h1>
      
      {cart.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-24 space-y-8 glass-panel border-white/80 relative overflow-hidden group"
        >
          <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
          <div className="bg-slate-50 w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner floating">
            <ShoppingCart className="w-14 h-14 text-slate-200" />
          </div>
          <div className="space-y-2">
            <p className="text-2xl font-bold text-slate-800">Your cart is empty</p>
            <p className="text-slate-400 font-medium">Looks like you haven't added anything yet.</p>
          </div>
          <Link to="/shop" className="btn-primary inline-flex px-12 py-5 shadow-xl shadow-brand-600/20">Explore Shop</Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-10">
          <div className="space-y-6">
            {cart.map((item) => (
              <motion.div 
                layout
                key={item.id} 
                className="glass-panel p-6 flex gap-6 items-center border-white/60 group hover:shadow-2xl transition-all duration-500"
              >
                <div className="relative overflow-hidden rounded-[2rem] shadow-xl">
                  <img src={item.image} alt={item.name} className="w-28 h-28 object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="font-bold text-xl text-slate-800 group-hover:text-brand-600 transition-colors">{item.name}</h4>
                    <p className="text-xs font-bold text-brand-600 uppercase tracking-widest">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 bg-slate-50/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100">
                      <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center hover:bg-brand-50 transition-all font-bold text-slate-400 hover:text-brand-600">-</button>
                      <span className="font-bold text-lg min-w-[24px] text-center text-slate-700">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center hover:bg-brand-50 transition-all font-bold text-slate-400 hover:text-brand-600">+</button>
                    </div>
                  </div>
                </div>
                <button onClick={() => updateQty(item.id, 0)} className="text-slate-300 hover:text-red-500 p-4 transition-all hover:bg-red-50 rounded-2xl active:scale-90">
                  <Trash2 className="w-7 h-7" />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="glass-panel p-10 space-y-8 border-white/80">
            <h3 className="text-2xl font-bold font-display tracking-tight">Delivery Details</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Delivery Address</label>
                <textarea 
                  className="input-field min-h-[100px]" 
                  placeholder="Enter your full address..." 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <button 
                onClick={handleGetLocation}
                className="flex items-center gap-3 text-brand-600 font-bold text-sm hover:bg-brand-50 px-4 py-2 rounded-xl transition-all"
              >
                <MapPin className="w-5 h-5" />
                {location ? "Location Captured" : "Use Current Location"}
              </button>

              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setPaymentMethod('cod')}
                    className={cn(
                      "p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3",
                      paymentMethod === 'cod' ? "border-brand-600 bg-brand-50 text-brand-600" : "border-slate-100 text-slate-400"
                    )}
                  >
                    <Truck className="w-8 h-8" />
                    <span className="font-bold text-sm">Cash on Delivery</span>
                  </button>
                  <button 
                    disabled
                    className="p-6 rounded-3xl border-2 border-slate-50 bg-slate-50 text-slate-300 flex flex-col items-center gap-3 cursor-not-allowed relative group"
                  >
                    <CreditCard className="w-8 h-8" />
                    <span className="font-bold text-sm">Online Payment</span>
                    <span className="absolute -top-2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded-full uppercase tracking-widest">Coming Soon</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-10 rounded-[3rem] space-y-8 shadow-2xl shadow-slate-900/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-[80px] -mr-24 -mt-24 group-hover:bg-brand-500/20 transition-colors" />
            <h3 className="text-2xl font-bold font-display tracking-tight relative z-10">Order Summary</h3>
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between text-base">
                <span className="text-slate-400 font-medium">Subtotal</span>
                <span className="font-bold">₹{total}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-slate-400 font-medium">Delivery Fee</span>
                <span className="text-brand-400 font-bold uppercase tracking-[0.2em] text-xs">Free Delivery</span>
              </div>
              <div className="border-t border-white/10 pt-8 flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-slate-400 font-medium block text-sm">Total Amount</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Includes all taxes</span>
                </div>
                <span className="font-bold text-4xl text-brand-500">₹{total}</span>
              </div>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={loading}
              className="w-full btn-primary py-6 text-xl shadow-2xl shadow-brand-600/30 relative z-10 disabled:opacity-50"
            >
              {loading ? "Placing Order..." : "Confirm Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const RemindersPage = ({ user }: { user: UserType | null }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newRem, setNewRem] = useState({ name: '', time: '', freq: 'Daily' });

  useEffect(() => {
    if (user) {
      const fetchReminders = async () => {
        const q = query(collection(db, 'reminders'), where('user_id', '==', user.id));
        const querySnapshot = await getDocs(q);
        const rems: Reminder[] = [];
        querySnapshot.forEach((doc) => {
          rems.push({ id: doc.id, ...doc.data() } as Reminder);
        });
        setReminders(rems);
      };
      fetchReminders();
    }
  }, [user]);

  const addReminder = async () => {
    if (!user || !newRem.name || !newRem.time) return;
    
    const remData = {
      user_id: user.id,
      medicine_name: newRem.name,
      time: newRem.time,
      frequency: newRem.freq,
      created_at: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'reminders'), remData);
    setReminders([...reminders, { id: docRef.id, ...remData }]);
    setShowAdd(false);
    setNewRem({ name: '', time: '', freq: 'Daily' });
  };

  const deleteReminder = async (id: string) => {
    await deleteDoc(doc(db, 'reminders', id));
    setReminders(reminders.filter(r => r.id !== id));
  };

  return (
    <div className="p-6 max-w-screen-md mx-auto space-y-10 pb-24 pt-10">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900">Medicine <span className="gradient-text italic">Reminders</span></h1>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-brand-600 text-white p-5 rounded-[2rem] shadow-xl shadow-brand-600/20 hover:bg-brand-700 transition-all active:scale-90"
        >
          <PlusCircle className="w-7 h-7" />
        </button>
      </div>

      <div className="space-y-6">
        {reminders.length === 0 ? (
          <div className="text-center py-24 glass-panel border-white/80 space-y-6 relative overflow-hidden group">
            <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
            <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner floating">
              <Clock className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No reminders set yet.</p>
          </div>
        ) : (
          reminders.map((rem) => (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={rem.id} 
              className="glass-panel p-6 flex justify-between items-center border-white/60 group hover:shadow-2xl transition-all duration-500"
            >
              <div className="flex items-center gap-6">
                <div className="bg-orange-50/50 backdrop-blur-sm p-5 rounded-[2rem] text-orange-500 shadow-inner group-hover:rotate-6 transition-transform">
                  <Clock className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xl text-slate-800 group-hover:text-brand-600 transition-colors">{rem.medicine_name}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-brand-600">{rem.time}</span>
                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                    <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{rem.frequency}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => deleteReminder(rem.id)} className="text-slate-300 hover:text-red-500 p-4 transition-all hover:bg-red-50 rounded-2xl active:scale-90">
                <Trash2 className="w-6 h-6" />
              </button>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-end md:items-center justify-center p-6">
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="glass-panel w-full max-w-md p-10 space-y-10 border-white/80 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-3xl font-display font-bold tracking-tight text-slate-900">Add <span className="gradient-text">Reminder</span></h3>
                <button onClick={() => setShowAdd(false)} className="bg-slate-50 p-3 rounded-2xl text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Medicine Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Paracetamol" 
                    className="input-field"
                    value={newRem.name}
                    onChange={(e) => setNewRem({...newRem, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Time</label>
                    <input 
                      type="time" 
                      className="input-field"
                      value={newRem.time}
                      onChange={(e) => setNewRem({...newRem, time: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Frequency</label>
                    <div className="relative">
                      <select 
                        className="input-field appearance-none"
                        value={newRem.freq}
                        onChange={(e) => setNewRem({...newRem, freq: e.target.value})}
                      >
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Twice a Day</option>
                      </select>
                      <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={addReminder}
                  className="w-full btn-primary py-6 text-xl shadow-2xl shadow-brand-600/30"
                >
                  Save Reminder
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WalletPage = ({ user }: { user: UserType | null }) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  useEffect(() => {
    if (user) {
      const fetchPrescriptions = async () => {
        const q = query(
          collection(db, 'prescriptions'), 
          where('user_id', '==', user.id),
          orderBy('created_at', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const docs: Prescription[] = [];
        querySnapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as Prescription);
        });
        setPrescriptions(docs);
      };
      fetchPrescriptions();
    }
  }, [user]);

  return (
    <div className="p-6 max-w-screen-md mx-auto space-y-10 pb-24 pt-10">
      <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900">Digital <span className="gradient-text italic">Wallet</span></h1>
      <div className="grid grid-cols-1 gap-8">
        {prescriptions.length === 0 ? (
          <div className="text-center py-24 glass-panel border-white/80 space-y-6 relative overflow-hidden group">
            <div className="absolute inset-0 shimmer opacity-5 pointer-events-none" />
            <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner floating">
              <Wallet className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No prescriptions saved yet.</p>
          </div>
        ) : (
          prescriptions.map((p) => {
            const data = JSON.parse(p.extracted_data);
            return (
              <motion.div 
                whileHover={{ y: -10 }}
                key={p.id} 
                className="glass-panel p-8 flex gap-8 items-center border-white/60 group hover:shadow-2xl transition-all duration-700 relative overflow-hidden"
              >
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
                <div className="relative">
                  <img src={p.image_url} alt="Prescription" className="w-32 h-32 object-cover rounded-[2rem] border-4 border-white shadow-xl group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute -top-3 -left-3 bg-brand-600 text-white p-2.5 rounded-2xl border-4 border-white shadow-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-xl text-slate-800 group-hover:text-brand-600 transition-colors">Prescription #{p.id}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Added on {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.medicines?.slice(0, 2).map((m: any, i: number) => (
                      <span key={i} className="bg-brand-50 text-brand-600 text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest border border-brand-100/50">
                        {m.name}
                      </span>
                    ))}
                    {data.medicines?.length > 2 && (
                      <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest border border-slate-100">
                        +{data.medicines.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
                <button className="bg-slate-50 p-4 rounded-2xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all active:scale-90">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin }: { onLogin: (u: UserType) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        let userData: any = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
          userData = userDoc.data();
        } catch (dbErr) {
          console.error("Firestore fetch failed:", dbErr);
          // Continue anyway, we have the auth user
        }
        
        onLogin({ 
          id: userCredential.user.uid, 
          name: userCredential.user.displayName || 'User', 
          email: userCredential.user.email || '',
          phone: userData?.phone || '',
          role: userData?.role || 'user'
        });
      } else {
        if (!name || !phone) {
          setError('Please fill all fields');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        try {
          // Save extra info to Firestore
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            name,
            email,
            phone,
            role: 'user', // Default role
            createdAt: new Date().toISOString()
          });
        } catch (dbErr) {
          console.error("Firestore save failed:", dbErr);
          // We still have the auth user, but profile data might be missing
        }
        
        onLogin({ 
          id: userCredential.user.uid, 
          name, 
          email, 
          phone,
          role: 'user'
        });
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase Console.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore, if not create
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          name: user.displayName,
          email: user.email,
          phone: '', // Google doesn't provide phone by default
          createdAt: new Date().toISOString()
        });
      }
      
      const userData = userDoc.data();
      onLogin({
        id: user.uid,
        name: user.displayName || 'User',
        email: user.email || '',
        phone: userData?.phone || '',
        role: userData?.role || 'user'
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse [animation-delay:2s]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 relative z-10 glass-panel p-12 border-white/80 shadow-2xl shadow-brand-900/5 group"
      >
        <div className="absolute inset-0 shimmer opacity-10 pointer-events-none" />
        <div className="text-center space-y-4 relative z-10">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="bg-brand-600 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto text-white shadow-2xl shadow-brand-600/30 floating"
          >
            <PlusCircle className="w-14 h-14" />
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-5xl font-display font-bold text-slate-900 tracking-tighter">Med<span className="gradient-text">Now</span></h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">AI Health Partner</p>
          </div>
        </div>

        <div className="flex bg-slate-100/50 backdrop-blur-sm p-1.5 rounded-2xl relative z-10">
          <button 
            onClick={() => setIsLogin(true)}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
              isLogin ? "bg-white text-brand-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Login
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
              !isLogin ? "bg-white text-brand-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-6 relative z-10">
          {!isLogin && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Full Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-slate-400">+91</span>
                  <input 
                    type="tel" 
                    placeholder="00000 00000" 
                    className="input-field pl-16"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
              </div>
            </motion.div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
            <input 
              type="email" 
              placeholder="john@example.com" 
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-xl border border-red-100"
            >
              {error}
            </motion.p>
          )}

          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-5 text-lg shadow-2xl shadow-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : isLogin ? "Login" : "Create Account"}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or continue with</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 rounded-2xl border border-slate-100 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-bold text-slate-600 shadow-sm active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          
          <p className="text-center text-[10px] text-slate-400 px-8 leading-relaxed">
            By continuing, you agree to our <span className="text-slate-600 font-bold hover:underline cursor-pointer">Terms</span> and <span className="text-slate-600 font-bold hover:underline cursor-pointer">Privacy</span>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.data();
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          phone: userData?.phone || '',
          role: userData?.role || 'user'
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    // Fetch dynamic data
    const unsubMeds = onSnapshot(collection(db, 'medicines'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
      setMedicines(docs.length > 0 ? docs : INITIAL_MEDICINES);
    });
    const unsubDocs = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      setDoctors(docs.length > 0 ? docs : INITIAL_DOCTORS.map(d => ({...d, id: d.id.toString()} as Doctor)));
    });

    return () => {
      unsubscribe();
      unsubMeds();
      unsubDocs();
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const addToCart = (med: Medicine) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === med.id);
      if (existing) {
        return prev.map(i => i.id === med.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...med, quantity: 1 }];
    });
  };

  const updateQty = (id: string, q: number) => {
    if (q <= 0) {
      setCart(prev => prev.filter(i => i.id !== id));
    } else {
      setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: q } : i));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <Router>
      <div className="min-h-screen mesh-bg relative overflow-hidden">
        {/* Background Decorative Blobs */}
        <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse [animation-delay:2s]" />
        
        <Navbar cartCount={cart.reduce((a, b) => a + b.quantity, 0)} user={user} />
        <main className="md:pt-20 relative z-10">
          <Routes>
            <Route path="/" element={<HomePage medicines={medicines} />} />
            <Route path="/shop" element={<ShopPage addToCart={addToCart} medicines={medicines} />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/upload" element={<UploadPage user={user} />} />
            <Route path="/cart" element={<CartPage cart={cart} updateQty={updateQty} clearCart={() => setCart([])} user={user} />} />
            <Route path="/reminders" element={<RemindersPage user={user} />} />
            <Route path="/wallet" element={<WalletPage user={user} />} />
            <Route path="/doctors" element={<DoctorsPage doctors={doctors} />} />
            <Route path="/admin" element={<AdminPanel user={user} />} />
            <Route path="/profile" element={
              <div className="p-4 max-w-screen-xl mx-auto space-y-10 pb-24 pt-10">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-center gap-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
                  <div className="relative">
                    <div className="w-32 h-32 bg-brand-100 rounded-[2.5rem] flex items-center justify-center text-brand-600 shadow-xl shadow-brand-600/10 border-4 border-white">
                      <User className="w-16 h-16" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl border-4 border-white shadow-lg">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center md:text-left space-y-2 flex-1">
                    <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">{user.name || 'User'}</h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <span className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                        +91 {user.phone}
                      </span>
                      <span className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
                        {user.email || 'No email set'}
                      </span>
                    </div>
                    <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-3">
                      <span className="bg-brand-50 text-brand-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-brand-100/50">
                        Premium Member
                      </span>
                      <button 
                        onClick={handleLogout}
                        className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-red-100/50 hover:bg-red-100 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Health Stats Card */}
                  <div className="md:col-span-2 glass-panel p-10 space-y-8">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="font-bold text-2xl tracking-tight">Health Stats</h3>
                        <p className="text-slate-400 text-xs font-medium">Last updated 2 hours ago</p>
                      </div>
                      <button className="text-brand-600 text-xs font-bold uppercase tracking-widest hover:underline">Sync Data</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                      {[
                        { label: 'Blood Group', value: 'O+', color: 'text-red-500', bg: 'bg-red-50/50' },
                        { label: 'Weight', value: '72 kg', color: 'text-blue-500', bg: 'bg-blue-50/50' },
                        { label: 'Height', value: '178 cm', color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
                      ].map((stat, i) => (
                        <div key={i} className={cn("p-6 rounded-[2.5rem] space-y-2 border border-white/50 backdrop-blur-sm", stat.bg)}>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{stat.label}</p>
                          <p className={cn("text-3xl font-display font-bold", stat.color)}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions Card */}
                  <div className="bg-slate-900 text-white p-10 rounded-[3rem] space-y-8 shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-500/20 transition-colors" />
                    <h3 className="font-bold text-2xl tracking-tight relative z-10">Quick Links</h3>
                    <div className="space-y-4 relative z-10">
                      <Link to="/wallet" className="flex items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group/item border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="bg-brand-500/20 p-2 rounded-xl">
                            <Wallet className="w-5 h-5 text-brand-400" />
                          </div>
                          <span className="text-sm font-bold">My Wallet</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-30 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
                      </Link>
                      <Link to="/reminders" className="flex items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group/item border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="bg-orange-500/20 p-2 rounded-xl">
                            <Clock className="w-5 h-5 text-orange-400" />
                          </div>
                          <span className="text-sm font-bold">Reminders</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-30 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
                      </Link>
                      <button onClick={() => setUser(null)} className="w-full flex items-center justify-between p-5 bg-red-500/10 rounded-2xl hover:bg-red-500/20 transition-all group/item border border-red-500/10 text-red-400">
                        <div className="flex items-center gap-4">
                          <div className="bg-red-500/20 p-2 rounded-xl">
                            <X className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-bold">Logout</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Order History Card */}
                  <div className="md:col-span-3 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-xl tracking-tight">Recent Orders</h3>
                      <Link to="/shop" className="text-brand-600 text-xs font-bold uppercase tracking-widest hover:underline">Shop More</Link>
                    </div>
                    <div className="text-center py-10 space-y-3">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <ShoppingCart className="w-6 h-6 text-slate-200" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">No recent orders found.</p>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-10">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">MedNow v2.4.0 • Crafted with Care</p>
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
