export type HoursSummaryItem = {
  dayOfWeek: number;
  openTime?: string;
  closeTime?: string;
  breakStart?: string;
  breakEnd?: string;
  closed?: boolean;
};

export type BookedSlot = {
  date: string;
  startTime: string;
  barberId?: string;
  status?: string;
};

export type OverrideItem = {
  date: string;
  barberId?: string;
  startTime: string;
  endTime: string;
};

export type ClosureItem = {
  startDate: string;
  endDate: string;
};

function normalizeText(value: unknown) {
  return typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    : '';
}

function parseTimeToMinutes(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatDayLabel(dayOfWeek: number) {
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  return dayNames[dayOfWeek] || '';
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildBookedCount(bookedSlots: BookedSlot[]) {
  const result = bookedSlots.reduce<Record<string, number>>((acc, slot) => {
    if (!slot.date || !slot.startTime) {
      console.warn('[buildBookedCount] Slot sem date ou startTime:', slot);
      return acc;
    }
    const key = `${slot.date}|${slot.startTime}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  
  console.log('[buildBookedCount] Booked slots contabilizados:', result);
  return result;
}

function isSlotBlockedByOverride(date: string, time: string, overrides: OverrideItem[]) {
  return overrides.some((override) => {
    if (override.date !== date) return false;
    if (override.barberId && override.barberId !== 'any') return false;
    return time >= override.startTime && time < override.endTime;
  });
}

export function getNextAvailableSlot(
  hoursSummary: HoursSummaryItem[],
  bookedSlots: BookedSlot[] = [],
  barberCount = 1,
  overrides: OverrideItem[] = [],
  closures: ClosureItem[] = [],
  now = new Date()
) {
  const sortedHours = buildHoursSummary(hoursSummary);
  const bookedCount = buildBookedCount(bookedSlots);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDate = formatDate(now);

  console.log(`[getNextAvailableSlot] Calculando próximo slot - data hoje: ${todayDate}, hora atual: ${Math.floor(currentMinutes / 60)}:${String(currentMinutes % 60).padStart(2, '0')}, barbeiros: ${barberCount}, booked slots: ${Object.keys(bookedCount).length}`);
  console.log('[getNextAvailableSlot] Slots bloqueados:', bookedCount);

  const isClosureOnDate = (date: string) =>
    closures.some((closure) => date >= closure.startDate && date <= closure.endDate);

  const findSlot = (dayOfWeek: number, date: string) => {
    const dayHours = sortedHours.find((hour) => hour.dayOfWeek === dayOfWeek);
    if (!dayHours || dayHours.closed) return null;

    const openMinutes = parseTimeToMinutes(dayHours.openTime);
    const closeMinutes = parseTimeToMinutes(dayHours.closeTime);
    const breakStartMinutes = parseTimeToMinutes(dayHours.breakStart);
    const breakEndMinutes = parseTimeToMinutes(dayHours.breakEnd);

    if (openMinutes === null || closeMinutes === null) return null;
    if (isClosureOnDate(date)) return null;

    let slotMinutes = openMinutes;
    while (slotMinutes + 1 <= closeMinutes) {
      const time = `${String(Math.floor(slotMinutes / 60)).padStart(2, '0')}:${String(slotMinutes % 60).padStart(2, '0')}`;
      const isDuringBreak =
        breakStartMinutes !== null &&
        breakEndMinutes !== null &&
        slotMinutes >= breakStartMinutes &&
        slotMinutes < breakEndMinutes;

      if (!isDuringBreak) {
        if (date !== todayDate || slotMinutes > currentMinutes) {
          if (!isSlotBlockedByOverride(date, time, overrides)) {
            const key = `${date}|${time}`;
            const count = bookedCount[key] || 0;
            const isAvailable = count === 0;

            if (!isAvailable) {
              console.log(`[getNextAvailableSlot] Slot ${key} BLOQUEADO por reserva pendente/confirmada`);
            }

            if (isAvailable) {
              return { time, slotMinutes };
            }
          }
        }
      }

      slotMinutes += 30;
    }

    return null;
  };

  for (let offset = 0; offset <= 7; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    const dateStr = formatDate(date);
    const dayOfWeek = date.getDay();

    const availableSlot = findSlot(dayOfWeek, dateStr);
    if (availableSlot) {
      const label =
        offset === 0
          ? `Hoy ${availableSlot.time}`
          : offset === 1
          ? `Mañana ${availableSlot.time}`
          : `${formatDayLabel(dayOfWeek)} ${availableSlot.time}`;
      const nextSlotValue = offset * 24 * 60 + availableSlot.slotMinutes - currentMinutes;
      return {
        nextSlot: label,
        nextSlotValue,
      };
    }
  }

  return {
    nextSlot: 'Consultar',
    nextSlotValue: Infinity,
  };
}

export function buildHoursSummary(hours: HoursSummaryItem[]) {
  return [...hours]
    .map((hour) => ({
      dayOfWeek: hour.dayOfWeek,
      openTime: hour.openTime || '',
      closeTime: hour.closeTime || '',
      breakStart: hour.breakStart || '',
      breakEnd: hour.breakEnd || '',
      closed: !!hour.closed,
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

export function buildServiceKeywords(services: Array<{ name?: string | null; active?: boolean | null }>) {
  const keywords = new Set<string>();

  services
    .filter((service) => service.active !== false)
    .forEach((service) => {
      const normalizedName = normalizeText(service.name);
      if (!normalizedName) {
        return;
      }

      keywords.add(normalizedName);

      normalizedName
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 2)
        .forEach((word) => keywords.add(word));
    });

  return Array.from(keywords).sort();
}

export function isShopOpenNow(hoursSummary: HoursSummaryItem[], now = new Date()) {
  const today = hoursSummary.find((hour) => hour.dayOfWeek === now.getDay());
  if (!today || today.closed) {
    return false;
  }

  const openMinutes = parseTimeToMinutes(today.openTime);
  const closeMinutes = parseTimeToMinutes(today.closeTime);
  if (openMinutes === null || closeMinutes === null) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
    return false;
  }

  const breakStartMinutes = parseTimeToMinutes(today.breakStart);
  const breakEndMinutes = parseTimeToMinutes(today.breakEnd);
  if (
    breakStartMinutes !== null &&
    breakEndMinutes !== null &&
    currentMinutes >= breakStartMinutes &&
    currentMinutes < breakEndMinutes
  ) {
    return false;
  }

  return true;
}
