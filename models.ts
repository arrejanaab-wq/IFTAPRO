import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  googleId?: string;
  displayName?: string;
  role: 'owner' | 'dispatcher';
  fleetId: string;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },
  displayName: { type: String },
  role: { type: String, enum: ['owner', 'dispatcher'], default: 'owner' },
  fleetId: { type: String, required: true }
}, { timestamps: true });

export interface ITrip extends Document {
  unit: string;
  state: string;
  miles: string;
  date: string;
  fleetId: string;
}

const TripSchema: Schema = new Schema({
  unit: { type: String, required: true },
  state: { type: String, required: true },
  miles: { type: String, required: true },
  date: { type: String, required: true },
  fleetId: { type: String, required: true, index: true }
}, { timestamps: true });

export interface IFuel extends Document {
  unit: string;
  state: string;
  gallons: string;
  date: string;
  vendor?: string;
  price_per_gal?: number;
  fleetId: string;
}

const FuelSchema: Schema = new Schema({
  unit: { type: String, required: true },
  state: { type: String, required: true },
  gallons: { type: String, required: true },
  date: { type: String, required: true },
  vendor: { type: String },
  price_per_gal: { type: Number },
  fleetId: { type: String, required: true, index: true }
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
export const Trip = mongoose.model<ITrip>('Trip', TripSchema);
export const Fuel = mongoose.model<IFuel>('Fuel', FuelSchema);

export interface ITruck extends Omit<Document, 'model'> {
  unit_id: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  fleetId: string;
}

const TruckSchema: Schema = new Schema({
  unit_id: { type: String, required: true, unique: true },
  make: { type: String },
  model: { type: String },
  year: { type: Number },
  vin: { type: String },
  fleetId: { type: String, required: true, index: true }
}, { timestamps: true });

export const Truck = mongoose.model<ITruck>('Truck', TruckSchema);
