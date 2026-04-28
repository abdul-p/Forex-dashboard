import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITrade extends Document {
  user: mongoose.Types.ObjectId;
  pair: string;
  type: "buy" | "sell";
  entryPrice: number;
  exitPrice?: number;
  lotSize: number;
  profit?: number;
  status: "open" | "closed";
  note?: string;
  openedAt: Date;
  closedAt?: Date;
}

const TradeSchema = new Schema<ITrade>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pair: { type: String, required: true },
    type: { type: String, enum: ["buy", "sell"], required: true },
    entryPrice: { type: Number, required: true },
    exitPrice: { type: Number },
    lotSize: { type: Number, required: true },
    profit: { type: Number },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    note: { type: String },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

const Trade: Model<ITrade> =
  mongoose.models.Trade || mongoose.model<ITrade>("Trade", TradeSchema);

export default Trade;
