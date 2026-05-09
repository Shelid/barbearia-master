'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { RecaptchaVerifier, linkWithPhoneNumber, PhoneAuthProvider, linkWithCredential, User } from 'firebase/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Phone, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VerifyPhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

export function VerifyPhoneDialog({ 
  open, 
  onOpenChange, 
  onVerified,
  title = "Verificación de teléfono requerida",
  description = "Para continuar, necesitas verificar tu número de teléfono. Esto nos ayuda a mantener la plataforma segura y evitar perfiles falsos."
}: VerifyPhoneDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+55');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (open) {
      // Clear state when dialog opens
      setPhoneNumber('');
      setVerificationCode('');
      setConfirmationResult(null);
      setIsVerified(false);
      setLoading(false);
    } else {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        } catch (e) {}
      }
    }
  }, [open]);

  const recaptchaRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node && !window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, node, {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
        });
      } catch (e) {
        console.error("Error setting up RecaptchaVerifier", e);
      }
    }
  }, []);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      toast.error('Por favor ingresa tu número de teléfono');
      return;
    }
    
    // Remove spaces, dashes, etc
    const cleanNumber = phoneNumber.replace(/[\s\-()]/g, '');
    const fullPhoneNumber = cleanNumber.startsWith('+') ? cleanNumber : `${countryCode}${cleanNumber}`;

    // Simple validation for E.164 format
    if (!/^\+[1-9]\d{1,14}$/.test(fullPhoneNumber)) {
      toast.error('El formato del número es inválido.');
      return;
    }

    setLoading(true);
    
    try {
      const appVerifier = window.recaptchaVerifier;
      const user = auth.currentUser;
      if (!user) throw new Error("No user found");

      const confirmation = await linkWithPhoneNumber(user, fullPhoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      toast.success('Código SMS enviado');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/credential-already-in-use') {
        toast.error('Este número ya está vinculado a otra cuenta.');
      } else if (error.message?.includes('region enabled') || error.code === 'auth/unauthorized-domain') {
        toast.error('Error de Firebase: Debes habilitar esta región (país) en Firebase Console > Authentication > Configuración > Política de regiones de SMS.');
      } else if (error.code === 'auth/billing-not-enabled') {
        toast.error('Error de Firebase: Debes actualizar tu proyecto al plan Blaze (pago por uso) para enviar SMS reales, o usar un número de prueba.');
      } else {
        toast.error('Error al enviar el código SMS. Verifica el número e intenta nuevamente.');
      }
      
      // Reset recaptcha if error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then((widgetId: any) => {
          grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || !confirmationResult) return;
    
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, verificationCode);
      const user = auth.currentUser;
      if (!user) throw new Error("No user found");
      
      await linkWithCredential(user, credential);
      
      const cleanNumber = phoneNumber.replace(/[\s\-()]/g, '');
      const fullPhoneNumber = cleanNumber.startsWith('+') ? cleanNumber : `${countryCode}${cleanNumber}`;
      
      // Update Firestore user profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        phoneVerified: true,
        phone: fullPhoneNumber
      });

      setIsVerified(true);
      toast.success('¡Teléfono verificado correctamente!');
      
      setTimeout(() => {
        onVerified();
        onOpenChange(false);
      }, 1500);

    } catch (error: any) {
      console.error(error);
      toast.error('Código inválido. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div id="recaptcha-container" ref={recaptchaRef}></div>
          
          {isVerified ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-emerald-700">Teléfono verificado</h3>
              <p className="text-center text-slate-500">
                Tu perfil ha sido verificado con éxito.
              </p>
            </div>
          ) : !confirmationResult ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Número de teléfono</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[100px] shrink-0">
                      <SelectValue placeholder="Código" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+55">🇧🇷 +55</SelectItem>
                      <SelectItem value="+351">🇵🇹 +351</SelectItem>
                      <SelectItem value="+34">🇪🇸 +34</SelectItem>
                      <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    placeholder="11 90000 0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ingresa tu número local sin el prefijo internacional.
                </p>
              </div>
              <Button 
                className="w-full gap-2" 
                onClick={handleSendCode} 
                disabled={loading || !phoneNumber}
              >
                <Phone className="w-4 h-4" />
                {loading ? 'Enviando...' : 'Enviar SMS de verificación'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg text-center mb-4">
                <p className="text-sm text-slate-600">
                  Hemos enviado un código por SMS a <br/>
                  <strong className="text-slate-900">
                    {phoneNumber.startsWith('+') ? phoneNumber : `${countryCode} ${phoneNumber}`}
                  </strong>
                </p>
                <button 
                  onClick={() => setConfirmationResult(null)}
                  className="text-xs text-primary mt-2 font-medium hover:underline"
                >
                  Cambiar número
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código de verificación</Label>
                <Input
                  id="code"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleVerifyCode} 
                disabled={loading || verificationCode.length < 6}
              >
                {loading ? 'Verificando...' : 'Verificar código'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
