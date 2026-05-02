'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
} from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState("7d");
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    newClients: 0
  });
  const [trends, setTrends] = useState({
    bookings: 0,
    revenue: 0,
    clients: 0,
    cancelRate: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.barbershopId) return;

    const fetchData = async () => {
      setLoading(true);
      const shopId = profile.barbershopId;

      // Fetch all bookings for this shop
      const bookingsSnapshot = await getDocs(collection(db, 'barbershops', shopId, 'bookings'));
      const allBookings = bookingsSnapshot.docs.map(doc => doc.data());

      const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;

      // Current period
      const today = new Date();
      today.setHours(23, 59, 59, 999); // end of today
      
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - periodDays + 1);
      pastDate.setHours(0, 0, 0, 0);

      const pastDateStr = pastDate.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];

      const currentBookings = allBookings.filter(b => b.date >= pastDateStr && b.date <= todayStr);
      const currentCompleted = currentBookings.filter(b => b.status === 'completed');
      const currentCancelled = currentBookings.filter(b => b.status === 'cancelled');
      const currentRevenue = currentCompleted.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
      const currentClients = new Set(currentBookings.map(b => b.clientPhone || b.clientName || b.clientUid)).size;

      setStats({
        totalBookings: currentBookings.length,
        completedBookings: currentCompleted.length,
        cancelledBookings: currentCancelled.length,
        totalRevenue: currentRevenue,
        newClients: currentClients
      });

      // Previous period
      const prevDateEnd = new Date(pastDate);
      prevDateEnd.setDate(prevDateEnd.getDate() - 1);
      
      const prevDateStart = new Date(prevDateEnd);
      prevDateStart.setDate(prevDateStart.getDate() - periodDays + 1);

      const prevDateStartStr = prevDateStart.toISOString().split('T')[0];
      const prevDateEndStr = prevDateEnd.toISOString().split('T')[0];

      const previousBookings = allBookings.filter(b => b.date >= prevDateStartStr && b.date <= prevDateEndStr);
      const prevCompleted = previousBookings.filter(b => b.status === 'completed');
      const prevCancelled = previousBookings.filter(b => b.status === 'cancelled');
      const prevRevenue = prevCompleted.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
      const prevClients = new Set(previousBookings.map(b => b.clientPhone || b.clientName || b.clientUid)).size;

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const currCancelRate = currentBookings.length > 0 ? (currentCancelled.length / currentBookings.length) : 0;
      const prevCancelRate = previousBookings.length > 0 ? (prevCancelled.length / previousBookings.length) : 0;
      const cancelRateChange = Math.round((currCancelRate - prevCancelRate) * 100);

      setTrends({
        bookings: calcChange(currentBookings.length, previousBookings.length),
        revenue: calcChange(currentRevenue, prevRevenue),
        clients: calcChange(currentClients, prevClients),
        cancelRate: cancelRateChange
      });

      // Generate chart data
      const daysArray = Array.from({ length: periodDays }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (periodDays - 1 - i));
        return d.toISOString().split('T')[0];
      });

      // For 90 days, maybe group by week to avoid crowding, but Recharts handles it well if we just format labels
      const data = daysArray.map(date => {
        const dayBookings = currentBookings.filter(b => b.date === date);
        const dayRevenue = dayBookings.filter(b => b.status === 'completed').reduce((acc, b) => acc + (Number(b.price) || 0), 0);
        
        return {
          name: date.split('-').slice(1).join('/'), // MM/DD
          bookings: dayBookings.length,
          revenue: dayRevenue
        };
      });

      setChartData(data);
      setLoading(false);
    };

    fetchData();
  }, [profile, period]);

  const renderTrend = (value: number, suffix = '%') => {
    const isPositive = value >= 0;
    const isCancelRate = suffix === 'pp'; // percentage points for cancel rate
    const isGoodPositive = isCancelRate ? !isPositive : isPositive; // For cancel rate, negative is good
    
    return (
      <div className={`text-sm font-medium flex items-center gap-2 w-fit px-3 py-1.5 rounded-full border ${
        isGoodPositive 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
          : 'bg-red-50 text-red-700 border-red-100'
      }`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>{isPositive ? '+' : ''}{value}{suffix === 'pp' ? '%' : suffix} vs periodo anterior</span>
      </div>
    );
  };

  if (loading && !chartData.length) return (
    <div className="flex h-[400px] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-slate-900 border border-slate-800 p-8 sm:p-10 shadow-lg mt-2">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <BarChart3 className="w-64 h-64 text-white transform rotate-6" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
              Informes y Estadísticas
            </h2>
            <p className="text-slate-400 mt-2 text-lg">
              Analiza el rendimiento de tu negocio para tomar mejores decisiones.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/10 shadow-sm mt-4 md:mt-0">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px] bg-transparent border-none text-white focus:ring-0 focus:ring-offset-0 font-medium">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                <SelectItem value="7d" className="cursor-pointer font-medium">Últimos 7 días</SelectItem>
                <SelectItem value="30d" className="cursor-pointer font-medium">Últimos 30 días</SelectItem>
                <SelectItem value="90d" className="cursor-pointer font-medium">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-[1px] h-8 bg-white/20 mx-1"></div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-xl" onClick={() => window.print()}>
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-slate-100 shadow-sm rounded-[24px] bg-white overflow-hidden group hover:shadow-md transition-all">
          <CardHeader className="pb-2 p-6 bg-slate-50/50">
            <CardDescription className="text-slate-500 font-bold uppercase tracking-wider text-xs">Citas Totales</CardDescription>
            <CardTitle className="text-4xl font-display text-slate-800">{stats.totalBookings}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4 border-t border-slate-50">
            {renderTrend(trends.bookings)}
          </CardContent>
        </Card>
        <Card className="border border-slate-100 shadow-sm rounded-[24px] bg-white overflow-hidden group hover:shadow-md transition-all">
          <CardHeader className="pb-2 p-6 bg-slate-50/50">
            <CardDescription className="text-slate-500 font-bold uppercase tracking-wider text-xs">Ingresos</CardDescription>
            <CardTitle className="text-4xl font-display text-slate-800">{stats.totalRevenue}€</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4 border-t border-slate-50">
            {renderTrend(trends.revenue)}
          </CardContent>
        </Card>
        <Card className="border border-slate-100 shadow-sm rounded-[24px] bg-white overflow-hidden group hover:shadow-md transition-all">
          <CardHeader className="pb-2 p-6 bg-slate-50/50">
            <CardDescription className="text-slate-500 font-bold uppercase tracking-wider text-xs">Nuevos Clientes</CardDescription>
            <CardTitle className="text-4xl font-display text-slate-800">{stats.newClients}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4 border-t border-slate-50">
            {renderTrend(trends.clients)}
          </CardContent>
        </Card>
        <Card className="border border-slate-100 shadow-sm rounded-[24px] bg-white overflow-hidden group hover:shadow-md transition-all">
          <CardHeader className="pb-2 p-6 bg-slate-50/50">
            <CardDescription className="text-slate-500 font-bold uppercase tracking-wider text-xs">Tasa de Cancelación</CardDescription>
            <CardTitle className="text-4xl font-display text-slate-800">
              {stats.totalBookings > 0 ? Math.round((stats.cancelledBookings / stats.totalBookings) * 100) : 0}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4 border-t border-slate-50">
            {renderTrend(trends.cancelRate, 'pp')}
          </CardContent>
        </Card>
      </div>

      <div className={`grid grid-cols-1 ${period === '90d' ? 'xl:grid-cols-1' : 'xl:grid-cols-2'} gap-8 mt-6`}>
        <Card className="border border-slate-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-slate-50">
            <CardTitle className="text-2xl font-bold text-slate-800">Citas por Día</CardTitle>
            <CardDescription className="text-base text-slate-500">Volumen de agendamientos en el periodo seleccionado.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748B', fontWeight: 500 }} dy={10} minTickGap={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748B', fontWeight: 500 }} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 20px', fontWeight: 'bold' }}
                />
                <Bar dataKey="bookings" fill="#0F172A" radius={[6, 6, 0, 0]} maxBarSize={48} name="Citas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-slate-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-slate-50">
            <CardTitle className="text-2xl font-bold text-slate-800">Ingresos Estimados</CardTitle>
            <CardDescription className="text-base text-slate-500">Evolución de la facturación diaria (€).</CardDescription>
          </CardHeader>
          <CardContent className="p-8 h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748B', fontWeight: 500 }} dy={10} minTickGap={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748B', fontWeight: 500 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 20px', fontWeight: 'bold' }}
                  formatter={(value) => [`${value}€`, 'Ingresos']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Ingresos"
                  stroke="#10B981" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#059669' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

