const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  products: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      productDetails: {
        // Embedded product details for deleted products
        _id: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: false,
        },
        name: { type: String },
        price: { type: Number },
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
      },
      payedQuantity: {
        // New field to track the number of units paid
        type: Number,
        default: 0,
      },
    },
  ],
  table: {
    type: Schema.Types.ObjectId,
    ref: "Table",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "preparing", "completed", "archived"],
    default: "pending",
  },
  statusTimestamps: {
    pending: { type: Date, default: null },
    preparing: { type: Date, default: null },
    completed: { type: Date, default: null },
    archived: { type: Date, default: null },
  },
  payed: {
    type: Boolean,
    default: false,
  },
  totalPrice: {
    type: Number,
  },
  timestamp: {
    type: Date,
    default: Date.now(),
  },
  rated: {
    type: Boolean,
    default: false,
  },
  //isClosed is used to get the receipit non-closed orders
  isClosed: {
    type: Boolean,
    default: false,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
});
// the trigger is used to calculate each time the order spent in each status
orderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    const status = this.status;
    if (!this.statusTimestamps[status]) {
      this.statusTimestamps[status] = new Date();
    }
  }
  next();
});

orderSchema.methods.getStatusDurations = function () {
  const durations = {};
  const timestamps = this.statusTimestamps;

  const statuses = ["pending", "preparing", "completed", "archived"];

  // Iterate over statuses to calculate durations
  for (let i = 0; i < statuses.length; i++) {
    const currentStatus = statuses[i];
    const nextStatus = statuses[i + 1];

    if (timestamps[currentStatus]) {
      // If there's a next status, calculate duration between current and next status
      if (nextStatus && timestamps[nextStatus]) {
        durations[currentStatus] =
          timestamps[nextStatus] - timestamps[currentStatus];
      } else {
        // For the last status (no next status), calculate time until now
        durations[currentStatus] = Date.now() - timestamps[currentStatus];
      }
    }
  }

  return durations; // returns durations in milliseconds
};

// set products details for recuperation in case of delete
orderSchema.pre("save", async function (next) {
  if (this.isModified("products")) {
    for (let i = 0; i < this.products.length; i++) {
      const product = await mongoose
        .model("Product")
        .findById(this.products[i].product);
      if (product) {
        this.products[i].productDetails = {
          _id: product._id,
          name: product.name,
          price: product.price,
        };
      }
    }
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
