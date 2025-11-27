import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ItemDocument = Item & Document;

export class Sticker {
  slot: number;
  stickerId: number;
  name: string;
  wear: number;
  iconUrl: string;
}

export class Gem {
  name: string;
  color: string;
  effect: string;
}

export class Description {
  type: string;
  value: string;
  color?: string;
}

export class Tag {
  category: string;
  internalName: string;
  localizedName: string;
  color?: string;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
      delete ret._id;
      return ret;
    },
  },
})
export class Item extends Document {
  @Prop({ required: true, unique: true, index: true })
  classId: string;

  @Prop({ index: true })
  instanceId: string;

  @Prop({ required: true, index: true })
  appId: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  marketName: string;

  @Prop({ index: true })
  marketHashName: string;

  @Prop()
  type: string;

  @Prop()
  rarity: string;

  @Prop()
  quality: string;

  @Prop()
  iconUrl: string;

  @Prop()
  iconUrlLarge: string;

  @Prop()
  backgroundColor: string;

  // CS:GO/CS2 specific fields
  @Prop()
  wear?: string;

  @Prop()
  floatValue?: number;

  @Prop()
  paintSeed?: number;

  @Prop()
  paintIndex?: number;

  @Prop({ type: [Object] })
  stickers?: Sticker[];

  // Dota 2 specific fields
  @Prop()
  hero?: string;

  @Prop()
  slot?: string;

  @Prop({ type: [Object] })
  gems?: Gem[];

  @Prop({ type: Object })
  inscribedGem?: Gem;

  // TF2 specific fields
  @Prop()
  craftable?: boolean;

  @Prop()
  killstreak?: string;

  // Rust specific fields
  @Prop()
  condition?: string;

  // General trading info
  @Prop({ default: true })
  tradable: boolean;

  @Prop({ default: true })
  marketable: boolean;

  @Prop({ default: false })
  commodity: boolean;

  @Prop()
  tradableAfter?: Date;

  // Descriptions and tags
  @Prop({ type: [Object], default: [] })
  descriptions: Description[];

  @Prop({ type: [Object], default: [] })
  tags: Tag[];

  // Metadata
  @Prop({ type: Object })
  rawData: any;

  @Prop()
  lastUpdated: Date;
}

export const ItemSchema = SchemaFactory.createForClass(Item);

// Compound indexes
ItemSchema.index({ appId: 1, marketHashName: 1 });
ItemSchema.index({ name: 'text' });

export const ItemName = Item.name;