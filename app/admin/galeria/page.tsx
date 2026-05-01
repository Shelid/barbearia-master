'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type GalleryPhoto = {
  id: string;
  url: string;
  createdAt?: {
    seconds?: number;
  } | null;
};

export default function GaleriaPage() {
  const { profile } = useAuth();
  const [shopId, setShopId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGallery = React.useCallback(async (currentShopId: string) => {
    const snapshot = await getDocs(collection(db, 'barbershops', currentShopId, 'gallery'));
    const data: GalleryPhoto[] = snapshot.docs.map((currentDoc) => ({
      id: currentDoc.id,
      ...(currentDoc.data() as Omit<GalleryPhoto, 'id'>),
    }));

    setPhotos(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!profile?.barbershopId) return;
    setShopId(profile.barbershopId);
    setLoading(true);
    loadGallery(profile.barbershopId).catch((error) => {
      console.error('Error loading gallery:', error);
      toast.error('No fue posible cargar la galeria');
      setLoading(false);
    });
  }, [loadGallery, profile]);

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compresso para 70% de qualidade JPEG
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = error => reject(error);
        img.src = event.target?.result as string;
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen valido.');
      return;
    }

    try {
      setUploading(true);
      const base64Image = await resizeImage(file);
      
      if (base64Image.length > 1048487) {
         toast.error('La imagen es demasiado grande incluso despues de comprimir.');
         setUploading(false);
         return;
      }

      await addDoc(collection(db, 'barbershops', shopId, 'gallery'), {
        url: base64Image,
        createdAt: serverTimestamp()
      });

      await loadGallery(shopId);
      toast.success('Foto anadida correctamente');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!shopId || !confirm('Estas seguro de que quieres eliminar esta foto?')) return;
    try {
      await deleteDoc(doc(db, 'barbershops', shopId, 'gallery', photoId));
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      toast.success('Foto eliminada');
    } catch (error) {
      toast.error('Error al eliminar la foto');
    }
  };

  if (loading) {
    return <div className="p-8">Cargando galería...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 border-b-4 border-indigo-600 inline-block pb-1">Galería de Fotos</h1>
          <p className="text-slate-500 mt-2">Muestra tus mejores cortes y el local a tus clientes.</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading}
            className="rounded-full gap-2 px-6 shadow-sm"
          >
            {uploading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Subiendo...' : 'Subir Foto'}
          </Button>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No has subido ninguna foto todavía.</p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Subir mi primera foto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img 
                src={photo.url} 
                alt="Gallery item" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                <div className="flex justify-end">
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8 rounded-full shadow-md"
                    onClick={() => handleDelete(photo.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
