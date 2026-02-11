export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  secondaryRoles?: string[];
  tenantId?: string;
  applicationStatus: string;
  bio?: string;
  isActive?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  directoryVisible: boolean;
  contactEmail: string;
  stripeAccountId?: string;
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gradeLevel?: string;
}

export interface ClassSession {
  id: string;
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: SessionNote[];
}

export interface SessionNote {
  id: string;
  sessionId: string;
  instructorId: string;
  content: string;
}

export interface Class {
  id: string;
  tenantId: string;
  instructorId: string;
  title: string;
  description?: string;
  price: number;
  capacity: number;
  status: string;
  imageUrl?: string;
  materialsUrl?: string;
  ageMin?: number;
  ageMax?: number;
  gradeMin?: string;
  gradeMax?: string;
  prerequisites?: string;
  sessions?: ClassSession[];
  instructor?: Pick<User, "id" | "firstName" | "lastName" | "email">;
  tenant?: Pick<Tenant, "id" | "name" | "slug">;
  _count?: {
    registrations?: number;
    sessions?: number;
  };
}

export interface Event {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  price: number;
  capacity?: number;
  status: string;
  imageUrl?: string;
  isFree: boolean;
  attendeeUnit: string;
  _count?: {
    registrations?: number;
  };
}

export interface Registration {
  id: string;
  userId: string;
  tenantId: string;
  classId?: string;
  eventId?: string;
  childId?: string;
  status: string;
  user?: Pick<User, "id" | "firstName" | "lastName" | "email" | "phone">;
  child?: Child;
  class?: Pick<Class, "id" | "title">;
  event?: Pick<Event, "id" | "title">;
}

export interface Payment {
  id: string;
  userId: string;
  tenantId: string;
  amount: number;
  status: string;
  stripePaymentIntentId?: string;
  description?: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  tenantId: string;
  classId?: string;
  title: string;
  type: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: Pick<User, "id" | "firstName" | "lastName" | "role">;
}

export interface CalendarEvent {
  type: "class_session" | "coop_event";
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  classId?: string;
  tenantName?: string;
  endDate?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
