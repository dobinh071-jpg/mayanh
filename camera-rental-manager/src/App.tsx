import { useState, useEffect, FormEvent, useRef } from 'react';
import { 
  Camera as CameraIcon, 
  Disc, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  LayoutDashboard, 
  ClipboardList, 
  Settings,
  Save,
  X,
  ChevronRight,
  TrendingUp,
  Users,
  Camera,
  MessageSquare,
  Send,
  Bot,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Rental, Camera as CameraType, Lens } from './types';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

export default function App() {
  const [activeTab, setActiveTab] = useState<'rentals' | 'inventory' | 'dashboard'>('rentals');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Partial<Rental> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Inventory forms
  const [newCamera, setNewCamera] = useState({ name: '', brand: '' });
  const [newLens, setNewLens] = useState({ name: '', brand: '' });
  const [editingCamera, setEditingCamera] = useState<CameraType | null>(null);
  const [editingLens, setEditingLens] = useState<Lens | null>(null);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem('bomne_avatar') || '/logo.jpg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Xin chào! Tôi là trợ lý AI của BOMNE. Tôi có thể giúp bạn kiểm tra thiết bị hoặc tạo đơn thuê mới.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const fetchData = async () => {
    try {
      const [rentalsRes, camerasRes, lensesRes] = await Promise.all([
        fetch('/api/rentals'),
        fetch('/api/cameras'),
        fetch('/api/lenses')
      ]);
      
      const rentalsData = await rentalsRes.json();
      const camerasData = await camerasRes.json();
      const lensesData = await lensesRes.json();

      if (Array.isArray(rentalsData)) setRentals(rentalsData);
      if (Array.isArray(camerasData)) setCameras(camerasData);
      if (Array.isArray(lensesData)) setLenses(lensesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleSaveRental = async (e: FormEvent) => {
    e.preventDefault();
    const method = editingRental?.id ? 'PUT' : 'POST';
    const url = editingRental?.id ? `/api/rentals/${editingRental.id}` : '/api/rentals';

    // Remove joined fields that don't belong in the rentals table
    const { id, camera_name, lens_name, cameras, lenses, ...payload } = editingRental as any;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setIsModalOpen(false);
    setEditingRental(null);
    fetchData();
  };

  const handleDeleteRental = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa đơn thuê này?')) {
      await fetch(`/api/rentals/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleAddCamera = async (e: FormEvent) => {
    e.preventDefault();
    if (editingCamera) {
      await fetch(`/api/cameras/${editingCamera.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCamera)
      });
      setEditingCamera(null);
    } else {
      await fetch('/api/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCamera)
      });
    }
    setNewCamera({ name: '', brand: '' });
    fetchData();
  };

  const handleAddLens = async (e: FormEvent) => {
    e.preventDefault();
    if (editingLens) {
      await fetch(`/api/lenses/${editingLens.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLens)
      });
      setEditingLens(null);
    } else {
      await fetch('/api/lenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLens)
      });
    }
    setNewLens({ name: '', brand: '' });
    fetchData();
  };

  const handleDeleteInventory = async (type: 'cameras' | 'lenses', id: number) => {
    if (confirm('Xóa mục này khỏi kho?')) {
      await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarUrl(base64String);
        localStorage.setItem('bomne_avatar', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Không tìm thấy API Key. Vui lòng kiểm tra lại cấu hình.");
      }
      const ai = new GoogleGenAI({ apiKey });

      const createRentalFunc: FunctionDeclaration = {
        name: "createRental",
        description: "Tạo một đơn thuê thiết bị mới",
        parameters: {
          type: Type.OBJECT,
          properties: {
            customer_name: { type: Type.STRING, description: "Tên khách hàng" },
            phone: { type: Type.STRING, description: "Số điện thoại khách hàng" },
            camera_name: { type: Type.STRING, description: "Tên máy ảnh muốn thuê (nếu có)" },
            lens_name: { type: Type.STRING, description: "Tên ống kính muốn thuê (nếu có)" },
            rental_date: { type: Type.STRING, description: "Ngày bắt đầu thuê (YYYY-MM-DD)" },
            return_date: { type: Type.STRING, description: "Ngày trả (YYYY-MM-DD)" },
            duration: { type: Type.STRING, description: "Thời gian thuê (VD: 2 ngày)" },
          },
          required: ["customer_name", "rental_date"]
        }
      };

      const systemInstruction = `Bạn là trợ lý quản lý cửa hàng cho thuê máy ảnh BOMNE.
Dưới đây là dữ liệu hiện tại của cửa hàng:
- Máy ảnh: ${JSON.stringify(cameras.map(c => ({ id: c.id, name: c.name, brand: c.brand })))}
- Ống kính: ${JSON.stringify(lenses.map(l => ({ id: l.id, name: l.name, brand: l.brand })))}
- Các đơn đang thuê: ${JSON.stringify(rentals.filter(r => !r.return_condition || r.return_condition === 'Chưa trả').map(r => ({ customer: r.customer_name, camera: r.camera_name, lens: r.lens_name, return_date: r.return_date })))}

Nhiệm vụ của bạn:
1. Trả lời các câu hỏi về tình trạng thiết bị (còn trống hay đang cho thuê).
2. Giúp người dùng tạo đơn thuê mới bằng cách gọi hàm createRental. Nếu người dùng yêu cầu thuê, hãy hỏi đủ thông tin (tên, sđt, thiết bị, ngày thuê) rồi gọi hàm.
Trả lời ngắn gọn, thân thiện bằng tiếng Việt.`;

      // Build history
      const history = chatMessages
        .filter(m => m.text !== 'Xin chào! Tôi là trợ lý AI của BOMNE. Tôi có thể giúp bạn kiểm tra thiết bị hoặc tạo đơn thuê mới.')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));
      history.push({ role: 'user', parts: [{ text: userMsg }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: history,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [createRentalFunc] }]
        }
      });

      if (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        if (call.name === 'createRental') {
          const args = call.args as any;
          
          // Find IDs based on names
          const cam = cameras.find(c => c.name.toLowerCase().includes((args.camera_name || '').toLowerCase()));
          const len = lenses.find(l => l.name.toLowerCase().includes((args.lens_name || '').toLowerCase()));

          const newRental = {
            customer_name: args.customer_name,
            phone: args.phone || '',
            camera_id: cam?.id || null,
            lens_id: len?.id || null,
            rental_date: args.rental_date || new Date().toISOString().split('T')[0],
            return_date: args.return_date || '',
            duration: args.duration || '',
            return_condition: 'Chưa trả',
            rental_fee: 0,
            deposit: 0,
            paid_amount: 0,
            remaining_amount: 0
          };

          await fetch('/api/rentals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRental)
          });
          
          fetchData();
          setChatMessages(prev => [...prev, { role: 'model', text: `Đã tạo đơn thuê thành công cho khách hàng ${args.customer_name}!` }]);
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'model', text: response.text || 'Xin lỗi, tôi không hiểu.' }]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'model', text: `Lỗi: ${error.message || 'Không thể kết nối AI'}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const filteredRentals = rentals.filter(r => {
    const matchText = r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      r.phone?.includes(searchTerm) ||
                      r.camera_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDate = searchDate ? r.rental_date === searchDate : true;
    return matchText && matchDate;
  });

  const totalPages = Math.ceil(filteredRentals.length / itemsPerPage);
  const paginatedRentals = filteredRentals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const stats = {
    totalRevenue: rentals.reduce((sum, r) => sum + (r.paid_amount || 0), 0),
    totalRentals: rentals.length,
    activeRentals: rentals.filter(r => !r.return_condition || r.return_condition === 'Chưa trả').length,
    remainingBalance: rentals.reduce((sum, r) => sum + (r.remaining_amount || 0), 0)
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-stone-50 pb-20 md:pb-0">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-stone-900 text-stone-300 flex-col border-r border-stone-800 shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img 
                src={avatarUrl} 
                alt="BOMNE Avatar" 
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 bg-white"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit2 className="w-4 h-4 text-white" />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <h1 className="font-bold text-white text-xl tracking-tight">BOMNE</h1>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800/50'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Tổng quan</span>
            </button>
            <button 
              onClick={() => setActiveTab('rentals')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'rentals' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800/50'}`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="font-medium">Quản lý thuê</span>
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-stone-800 text-white' : 'hover:bg-stone-800/50'}`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Kho thiết bị</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full">
        <header className="bg-white border-b border-stone-200 p-4 md:px-8 md:py-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 sticky top-0 z-10">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="flex items-center gap-3 bg-stone-100 px-4 py-2 rounded-full w-full md:w-80">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Tìm khách hàng, thiết bị..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full p-0"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 bg-stone-100 px-4 py-2 rounded-full w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500 font-medium whitespace-nowrap">Ngày thuê:</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none focus:ring-0 text-sm p-0 w-full"
                  value={searchDate}
                  onChange={(e) => { setSearchDate(e.target.value); setCurrentPage(1); }}
                />
              </div>
              {searchDate && (
                <button onClick={() => { setSearchDate(''); setCurrentPage(1); }} className="text-stone-400 hover:text-stone-600 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <button 
            onClick={() => {
              setEditingRental({
                customer_name: '',
                rental_fee: 0,
                deposit: 0,
                paid_amount: 0,
                remaining_amount: 0,
                rental_date: new Date().toISOString().split('T')[0],
                return_condition: 'Chưa trả'
              });
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 md:py-2 rounded-full font-medium flex items-center justify-center gap-2 transition-colors shadow-sm w-full md:w-auto"
          >
            <Plus className="w-4 h-4" />
            Tạo đơn mới
          </button>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-emerald-100 p-3 rounded-2xl">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                    <p className="text-stone-500 text-sm font-medium">Doanh thu (Đã nhận)</p>
                    <h3 className="text-2xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-100 p-3 rounded-2xl">
                        <ClipboardList className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-stone-500 text-sm font-medium">Tổng số đơn</p>
                    <h3 className="text-2xl font-bold mt-1">{stats.totalRentals}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-amber-100 p-3 rounded-2xl">
                        <Users className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                    <p className="text-stone-500 text-sm font-medium">Đơn đang thuê</p>
                    <h3 className="text-2xl font-bold mt-1">{stats.activeRentals}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-rose-100 p-3 rounded-2xl">
                        <Plus className="w-6 h-6 text-rose-600" />
                      </div>
                    </div>
                    <p className="text-stone-500 text-sm font-medium">Công nợ còn lại</p>
                    <h3 className="text-2xl font-bold mt-1">{formatCurrency(stats.remainingBalance)}</h3>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                    <h2 className="font-bold text-lg">Đơn thuê gần đây</h2>
                    <button onClick={() => setActiveTab('rentals')} className="text-emerald-600 text-sm font-medium flex items-center gap-1">
                      Xem tất cả <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="excel-table border-none">
                      <thead>
                        <tr className="bg-stone-50/50">
                          <th className="border-none pl-6">Khách hàng</th>
                          <th className="border-none">Thiết bị</th>
                          <th className="border-none">Ngày thuê</th>
                          <th className="border-none">Tổng tiền</th>
                          <th className="border-none">Trạng thái</th>
                          <th className="border-none pr-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rentals.slice(0, 5).map(rental => (
                          <tr key={rental.id} className="border-b border-stone-50 last:border-none">
                            <td className="border-none pl-6 py-4">
                              <div className="font-medium">{rental.customer_name}</div>
                              <div className="text-xs text-stone-400">{rental.phone}</div>
                            </td>
                            <td className="border-none py-4">
                              <div className="text-sm">{rental.camera_name || 'N/A'}</div>
                              <div className="text-xs text-stone-400">{rental.lens_name}</div>
                            </td>
                            <td className="border-none py-4 text-stone-600">{rental.rental_date}</td>
                            <td className="border-none py-4 font-medium">{formatCurrency(rental.rental_fee)}</td>
                            <td className="border-none py-4 flex flex-col gap-2 items-start">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${(!rental.return_condition || rental.return_condition === 'Chưa trả') ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {(!rental.return_condition || rental.return_condition === 'Chưa trả') ? 'Đang thuê' : 'Đã trả'}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${rental.remaining_amount === 0 ? 'bg-stone-100 text-stone-600' : 'bg-amber-100 text-amber-700'}`}>
                                {rental.remaining_amount === 0 ? 'Đã thanh toán' : 'Còn nợ'}
                              </span>
                            </td>
                            <td className="border-none pr-6 py-4 text-right">
                              <button onClick={() => { setEditingRental(rental); setIsModalOpen(true); }} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'rentals' && (
              <motion.div 
                key="rentals"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="excel-table">
                    <thead>
                      <tr className="bg-emerald-600 text-white">
                        <th className="bg-emerald-600 text-white border-emerald-500">Họ tên</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">SĐT</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Ngày thuê</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Giờ nhận</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Ngày trả</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Giờ trả</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Thời gian</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Tiền thuê</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Tiền cọc</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Đã trả</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Còn lại</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Thanh toán</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Trạng thái</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Ghi chú</th>
                        <th className="bg-emerald-600 text-white border-emerald-500">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRentals.map(rental => (
                        <tr key={rental.id} className={rental.remaining_amount > 0 ? 'bg-amber-50/30' : ''}>
                          <td>{rental.customer_name}</td>
                          <td>{rental.phone}</td>
                          <td>{rental.rental_date}</td>
                          <td>{rental.pickup_time}</td>
                          <td>{rental.return_date}</td>
                          <td>{rental.return_time}</td>
                          <td>{rental.duration}</td>
                          <td className="font-medium">{formatCurrency(rental.rental_fee)}</td>
                          <td>{formatCurrency(rental.deposit)}</td>
                          <td className="text-emerald-600 font-medium">{formatCurrency(rental.paid_amount)}</td>
                          <td className={rental.remaining_amount > 0 ? 'text-rose-600 font-bold' : ''}>
                            {formatCurrency(rental.remaining_amount)}
                          </td>
                          <td>{rental.payment_method}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${(!rental.return_condition || rental.return_condition === 'Chưa trả') ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {(!rental.return_condition || rental.return_condition === 'Chưa trả') ? 'Đang thuê' : 'Đã trả'}
                            </span>
                          </td>
                          <td className="max-w-xs truncate">{rental.notes}</td>
                          <td>
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingRental(rental); setIsModalOpen(true); }} className="p-1 hover:bg-stone-200 rounded text-blue-600">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteRental(rental.id)} className="p-1 hover:bg-stone-200 rounded text-rose-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-stone-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-stone-50">
                    <div className="text-sm text-stone-500 text-center md:text-left">
                      Hiển thị <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredRentals.length)}</span> trong tổng số <span className="font-medium">{filteredRentals.length}</span> đơn
                    </div>
                    <div className="flex gap-2 overflow-x-auto max-w-full pb-2 md:pb-0">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg border border-stone-200 bg-white text-sm font-medium hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Trước
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center ${currentPage === page ? 'bg-emerald-600 text-white' : 'hover:bg-stone-200 text-stone-600'}`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg border border-stone-200 bg-white text-sm font-medium hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* Cameras Section */}
                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <CameraIcon className="w-6 h-6 text-emerald-600" />
                      Danh sách máy ảnh
                    </h2>
                  </div>
                  
                  <form onSubmit={handleAddCamera} className="flex gap-2 mb-6">
                    <input 
                      type="text" 
                      placeholder="Tên máy (VD: Sony A7III)" 
                      className="flex-1 rounded-xl border-stone-200 text-sm"
                      value={newCamera.name}
                      onChange={e => setNewCamera({...newCamera, name: e.target.value})}
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Hãng" 
                      className="w-24 rounded-xl border-stone-200 text-sm"
                      value={newCamera.brand}
                      onChange={e => setNewCamera({...newCamera, brand: e.target.value})}
                    />
                    <button type="submit" className={`${editingCamera ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white p-2 rounded-xl transition-colors`}>
                      {editingCamera ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
                    {editingCamera && (
                      <button 
                        type="button" 
                        onClick={() => { setEditingCamera(null); setNewCamera({ name: '', brand: '' }); }}
                        className="bg-stone-200 text-stone-600 p-2 rounded-xl hover:bg-stone-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </form>

                  <div className="space-y-2">
                    {cameras.map(camera => (
                      <div key={camera.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 group">
                        <div>
                          <div className="font-medium">{camera.name}</div>
                          <div className="text-xs text-stone-400 uppercase tracking-wider">{camera.brand}</div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => { setEditingCamera(camera); setNewCamera({ name: camera.name, brand: camera.brand }); }}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteInventory('cameras', camera.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lenses Section */}
                <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Disc className="w-6 h-6 text-blue-600" />
                      Danh sách ống kính
                    </h2>
                  </div>

                  <form onSubmit={handleAddLens} className="flex gap-2 mb-6">
                    <input 
                      type="text" 
                      placeholder="Tên lens (VD: 24-70mm f2.8)" 
                      className="flex-1 rounded-xl border-stone-200 text-sm"
                      value={newLens.name}
                      onChange={e => setNewLens({...newLens, name: e.target.value})}
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Hãng" 
                      className="w-24 rounded-xl border-stone-200 text-sm"
                      value={newLens.brand}
                      onChange={e => setNewLens({...newLens, brand: e.target.value})}
                    />
                    <button type="submit" className={`${editingLens ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white p-2 rounded-xl transition-colors`}>
                      {editingLens ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </button>
                    {editingLens && (
                      <button 
                        type="button" 
                        onClick={() => { setEditingLens(null); setNewLens({ name: '', brand: '' }); }}
                        className="bg-stone-200 text-stone-600 p-2 rounded-xl hover:bg-stone-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </form>

                  <div className="space-y-2">
                    {lenses.map(lens => (
                      <div key={lens.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100 group">
                        <div>
                          <div className="font-medium">{lens.name}</div>
                          <div className="text-xs text-stone-400 uppercase tracking-wider">{lens.brand}</div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => { setEditingLens(lens); setNewLens({ name: lens.name, brand: lens.brand }); }}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteInventory('lenses', lens.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Rental Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 100 }}
              className="bg-white w-full max-w-4xl rounded-t-3xl md:rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-4 md:p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 shrink-0">
                <h2 className="text-xl md:text-2xl font-bold">{editingRental?.id ? 'Chỉnh sửa đơn thuê' : 'Tạo đơn thuê mới'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSaveRental} className="p-4 md:p-8 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-stone-400 text-xs uppercase tracking-widest">Thông tin khách hàng</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Họ tên khách hàng</label>
                      <input 
                        type="text" 
                        className="w-full rounded-xl border-stone-200"
                        value={editingRental?.customer_name || ''}
                        onChange={e => setEditingRental({...editingRental!, customer_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Số điện thoại</label>
                      <input 
                        type="text" 
                        className="w-full rounded-xl border-stone-200"
                        value={editingRental?.phone || ''}
                        onChange={e => setEditingRental({...editingRental!, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Equipment Info */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-stone-400 text-xs uppercase tracking-widest">Thiết bị thuê</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Máy ảnh</label>
                      <select 
                        className="w-full rounded-xl border-stone-200"
                        value={editingRental?.camera_id || ''}
                        onChange={e => setEditingRental({...editingRental!, camera_id: Number(e.target.value)})}
                      >
                        <option value="">-- Chọn máy ảnh --</option>
                        {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ống kính</label>
                      <select 
                        className="w-full rounded-xl border-stone-200"
                        value={editingRental?.lens_id || ''}
                        onChange={e => setEditingRental({...editingRental!, lens_id: Number(e.target.value)})}
                      >
                        <option value="">-- Chọn ống kính --</option>
                        {lenses.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Time Info */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-stone-400 text-xs uppercase tracking-widest">Thời gian</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ngày thuê</label>
                        <input 
                          type="date" 
                          className="w-full rounded-xl border-stone-200"
                          value={editingRental?.rental_date || ''}
                          onChange={e => setEditingRental({...editingRental!, rental_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Giờ nhận</label>
                        <input 
                          type="text" 
                          placeholder="VD: 9h"
                          className="w-full rounded-xl border-stone-200"
                          value={editingRental?.pickup_time || ''}
                          onChange={e => setEditingRental({...editingRental!, pickup_time: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Ngày trả</label>
                        <input 
                          type="date" 
                          className="w-full rounded-xl border-stone-200"
                          value={editingRental?.return_date || ''}
                          onChange={e => setEditingRental({...editingRental!, return_date: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Giờ trả</label>
                        <input 
                          type="text" 
                          placeholder="VD: 21h"
                          className="w-full rounded-xl border-stone-200"
                          value={editingRental?.return_time || ''}
                          onChange={e => setEditingRental({...editingRental!, return_time: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tổng thời gian thuê</label>
                      <input 
                        type="text" 
                        placeholder="VD: 12h hoặc 2 ngày"
                        className="w-full rounded-xl border-stone-200"
                        value={editingRental?.duration || ''}
                        onChange={e => setEditingRental({...editingRental!, duration: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Financial Info */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-stone-400 text-xs uppercase tracking-widest">Tài chính</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tiền thuê (VND)</label>
                        <input 
                          type="text" 
                          className="w-full rounded-xl border-stone-200"
                          value={editingRental?.rental_fee ? new Intl.NumberFormat('vi-VN').format(editingRental.rental_fee) : ''}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            const fee = val ? parseInt(val, 10) : 0;
                            const paid = editingRental?.paid_amount || 0;
                            setEditingRental({...editingRental!, rental_fee: fee, remaining_amount: fee - paid});
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tiền cọc (VND)</label>
                        <input 
                          type="text" 
                          className="w-full rounded-xl border-stone-200"
                          value={editingRental?.deposit ? new Intl.NumberFormat('vi-VN').format(editingRental.deposit) : ''}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setEditingRental({...editingRental!, deposit: val ? parseInt(val, 10) : 0});
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Đã thanh toán (VND)</label>
                        <input 
                          type="text" 
                          className="w-full rounded-xl border-stone-200"
                          value={editingRental?.paid_amount ? new Intl.NumberFormat('vi-VN').format(editingRental.paid_amount) : ''}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            const paid = val ? parseInt(val, 10) : 0;
                            const fee = editingRental?.rental_fee || 0;
                            setEditingRental({...editingRental!, paid_amount: paid, remaining_amount: fee - paid});
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Còn lại (VND)</label>
                        <input 
                          type="text" 
                          className="w-full rounded-xl border-stone-200 bg-stone-100"
                          value={editingRental?.remaining_amount ? new Intl.NumberFormat('vi-VN').format(editingRental.remaining_amount) : '0'}
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Hình thức thanh toán</label>
                      <select 
                        className="w-full rounded-xl border-stone-200"
                        value={editingRental?.payment_method || ''}
                        onChange={e => setEditingRental({...editingRental!, payment_method: e.target.value})}
                      >
                        <option value="">-- Chọn --</option>
                        <option value="TM">Tiền mặt (TM)</option>
                        <option value="CK">Chuyển khoản (CK)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trạng thái trả máy</label>
                    <select 
                      className="w-full rounded-xl border-stone-200"
                      value={editingRental?.return_condition || 'Chưa trả'}
                      onChange={e => setEditingRental({...editingRental!, return_condition: e.target.value})}
                    >
                      <option value="Chưa trả">Đang thuê (Chưa trả)</option>
                      <option value="Đã trả - Bình thường">Đã trả - Bình thường</option>
                      <option value="Đã trả - Có lỗi">Đã trả - Có lỗi</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ghi chú thêm</label>
                    <textarea 
                      className="w-full rounded-xl border-stone-200 h-24"
                      value={editingRental?.notes || ''}
                      onChange={e => setEditingRental({...editingRental!, notes: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-col md:flex-row gap-4">
                  <button 
                    type="submit"
                    className="w-full md:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all order-1 md:order-none"
                  >
                    <Save className="w-5 h-5" />
                    Lưu thông tin
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full md:w-auto px-8 py-4 rounded-2xl font-bold border border-stone-200 hover:bg-stone-50 transition-all order-2 md:order-none"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Chatbot */}
      <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-white w-[350px] md:w-[400px] h-[500px] max-h-[70vh] rounded-2xl shadow-2xl border border-stone-200 mb-4 flex flex-col overflow-hidden"
            >
              <div className="bg-emerald-600 text-white p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <h3 className="font-bold">BOMNE AI</h3>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="hover:bg-emerald-700 p-1 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-stone-200 text-stone-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm ${msg.role === 'user' ? 'bg-stone-900 text-white rounded-tr-none' : 'bg-white border border-stone-200 shadow-sm rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-white border border-stone-200 shadow-sm rounded-tl-none flex gap-1 items-center">
                      <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-stone-100 flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Hỏi AI hoặc yêu cầu tạo đơn..."
                  className="flex-1 rounded-xl border-stone-200 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={isChatLoading}
                />
                <button 
                  type="submit" 
                  disabled={isChatLoading || !chatInput.trim()}
                  className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-stone-900 text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-900 text-stone-300 flex justify-around items-center p-3 z-40 pb-safe">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl ${activeTab === 'dashboard' ? 'text-emerald-400' : 'text-stone-400'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Tổng quan</span>
        </button>
        <button 
          onClick={() => setActiveTab('rentals')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl ${activeTab === 'rentals' ? 'text-emerald-400' : 'text-stone-400'}`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px] font-medium">Đơn thuê</span>
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl ${activeTab === 'inventory' ? 'text-emerald-400' : 'text-stone-400'}`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium">Kho</span>
        </button>
      </nav>
    </div>
  );
}
