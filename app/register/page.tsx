'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scissors, Mail, Lock, Store, MapPin, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    shopName: '',
    region: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (step === 1) {
      setStep(2);
      return;
    }

    setLoading(true);
    console.log('Iniciando registro...');
    try {
      let user = auth.currentUser;
      
      if (!user) {
        console.log('Creando usuario auth...');
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        user = userCredential.user;
        await updateProfile(user, { displayName: formData.name });
      }

      if (!user) throw new Error('No se pudo crear o encontrar el usuario');

      // Check if user already has a barbershop to prevent duplicates
      const existingUserDoc = await getDoc(doc(db, 'users', user.uid));
      const existingUserData = existingUserDoc.exists() ? existingUserDoc.data() : null;
      if (existingUserDoc.exists() && existingUserDoc.data().barbershopId) {
        toast.error('Ya tienes una barbería registrada.');
        router.push('/admin');
        setLoading(false);
        return;
      }

      const shopId = Math.random().toString(36).substring(7);
      
      const slugify = (text: string) => text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');

      const slug = slugify(formData.shopName);
      
      // Check for slug uniqueness
      const slugQuery = query(collection(db, 'barbershops'), where('slug', '==', slug));
      const slugSnapshot = await getDocs(slugQuery);
      if (!slugSnapshot.empty) {
        toast.error('Ya existe una barbería con este nombre. Por favor, elige uno diferente.');
        setLoading(false);
        return;
      }

      const regionSlug = slugify(formData.region);
      const citySlug = slugify(formData.city);

      // Create shop doc
      console.log('Creando barbería en firestore...');
      const shopData = {
        id: shopId,
        slug,
        ownerUid: user.uid, // Track ownership for future deletion/admin tools
        name: formData.shopName,
        region: formData.region,
        regionSlug,
        city: formData.city,
        citySlug,
        active: true,
        setupComplete: false, // Flag to indicate if services/barbers have been added
        plan: 'starter',
        rating: 5.0,
        reviewsCount: 0,
        address: '',
        locationReference: '',
        latitude: null,
        longitude: null,
        geohash: '',
        hasExactLocation: false,
        googleMapsUrl: '',
        image: `https://picsum.photos/seed/${slug}/800/600`, // Default placeholder
        nextSlot: 'Consultar',
        priceRange: '€€',
        createdAt: new Date().toISOString(),
      };
      
      try {
        await setDoc(doc(db, 'barbershops', shopId), shopData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `barbershops/${shopId}`);
      }

      // Create user doc
      console.log('Creando perfil de usuario en firestore...');
      const userData: Record<string, unknown> = {
        uid: user.uid,
        email: formData.email,
        displayName: formData.name,
        role: 'admin',
        barbershopId: shopId,
        createdAt: existingUserData?.createdAt || new Date().toISOString(),
      };

      if (existingUserData?.birthdate) {
        userData.birthdate = existingUserData.birthdate;
      }
      if (existingUserData?.photoUrl) {
        userData.photoUrl = existingUserData.photoUrl;
      }
      if (existingUserData?.photoURL) {
        userData.photoURL = existingUserData.photoURL;
      }

      try {
        await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }

      console.log('Registro completado con éxito');
      toast.success('¡Barbería registrada con éxito!');
      router.push('/admin');
    } catch (error: any) {
      console.error('Error en el proceso de registro:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este email ya está registrado. Por favor, inicia sesión.');
        router.push('/login');
      } else {
        // Parse JSON error from handleFirestoreError if applicable
        let message = error.message;
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) message = parsed.error;
        } catch (e) {}
        
        toast.error('Error al registrar: ' + message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Scissors className="text-primary-foreground w-6 h-6" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">BarberFlow</span>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Únete a BarberFlow</h2>
          <p className="text-muted-foreground mt-2">Empieza a gestionar tu barbería hoy mismo.</p>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-2xl">{step === 1 ? 'Tus Datos' : 'Tu Barbería'}</CardTitle>
              <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-primary' : 'bg-primary/20'}`} />
                <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-primary' : 'bg-primary/20'}`} />
              </div>
            </div>
            <CardDescription>
              {step === 1 
                ? 'Crea tu cuenta personal de administrador.' 
                : 'Dinos dónde está tu local para que los clientes te encuentren.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="grid gap-4">
              {step === 1 ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input 
                      id="name" 
                      placeholder="Juan García" 
                      className="h-12"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Profesional</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="juan@barberia.com" 
                      className="h-12"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      className="h-12"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="shopName">Nombre de la Barbería</Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="shopName" 
                        placeholder="Barbería García" 
                        className="pl-10 h-12"
                        value={formData.shopName}
                        onChange={(e) => setFormData({...formData, shopName: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="region">Comunidad Autónoma</Label>
                    <Input 
                      id="region" 
                      placeholder="Asturias" 
                      className="h-12"
                      value={formData.region}
                      onChange={(e) => setFormData({...formData, region: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">Ciudad / Localidad</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="city" 
                        placeholder="Oviedo" 
                        className="pl-10 h-12"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex gap-3 mt-4">
                {step === 2 && (
                  <Button type="button" variant="outline" className="h-12 flex-1" onClick={() => setStep(1)}>
                    Atrás
                  </Button>
                )}
                <Button type="submit" className="h-12 flex-1 text-lg font-bold" disabled={loading}>
                  {loading ? 'Registrando...' : step === 1 ? 'Siguiente' : 'Finalizar Registro'}
                  {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-center gap-2 border-t p-6">
            <span className="text-sm text-muted-foreground">¿Ya tienes cuenta?</span>
            <Link href="/login" className="text-sm font-bold text-primary hover:underline">Inicia sesión</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
