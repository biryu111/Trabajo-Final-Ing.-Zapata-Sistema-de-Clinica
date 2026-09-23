import React from 'react';
import { Activity, Phone, Mail, MapPin, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Columna 1: Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-lg text-white">
                Clínica <span className="text-emerald-400">Salud & Bienestar</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Atención médica integral con tecnología de punta y calidez humana. Tu bienestar es nuestra prioridad.
            </p>
          </div>

          {/* Columna 2: Especialidades */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Especialidades</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Cardiología</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Pediatría</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Dermatología</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Medicina General</a></li>
            </ul>
          </div>

          {/* Columna 3: Horarios */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Atención Médica</h4>
            <div className="text-sm space-y-2">
              <p><span className="text-amber-400 font-medium">Lunes a Viernes:</span> 08:00 AM - 07:00 PM</p>
              <p><span className="text-amber-400 font-medium">Sábados:</span> 08:00 AM - 02:00 PM</p>
              <p><span className="text-pink-400 font-medium">Urgencias:</span> 24 Horas disponibles</p>
            </div>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>+51 (01) 456-7890</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-pink-400" />
                <span>contacto@clinicasalud.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Av. Salud 450, Lima, Perú</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center text-xs flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Clínica Salud & Bienestar. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Diseñado con <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> para el cuidado de la salud.
          </p>
        </div>
      </div>
    </footer>
  );
};
