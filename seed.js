const mongoose = require('mongoose');
const User = require('./models/User');
const Table = require('./models/Table');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Menu = require('./models/Menu');
const Order = require('./models/Order');

async function seedDatabase() {
  try {
    await mongoose.connect('mongodb+srv://saadliwissem88:12715083w@cafein.ctsilpo.mongodb.net/?retryWrites=true&w=majority&appName=CafeIn', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Clear the existing collections
    await User.deleteMany({});
    await Table.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Menu.deleteMany({});
    await Order.deleteMany({});

    // Create users
    const users = await User.insertMany([
      { fullName: "John Doe", email: "john@example.com", password: "password", verificationCode: "12345", role: "client" },
      { fullName: "Jane Smith", email: "jane@example.com", password: "password", verificationCode: "54321", role: "client" },
    ]);

    // Create tables
    const tables = await Table.insertMany([
      { number: 1, user: users[0]._id },
      { number: 2, user: users[1]._id },
    ]);

    // Create products
    const products = await Product.insertMany([
      {
        name: "Veg Mixer",
        description: "Tomato Salad & Carrot",
        price: 5.99,
        rate: 5.0,
        raters: 87,
        img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=80",
        available: true,
      },
      {
        name: "Macaroni",
        description: "Cheese Pizza",
        price: 2.99,
        rate: 4.8,
        raters: 32,
        img: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=80",
        available: true,
      },
      {
        name: "Chicken Wings",
        description: "Spicy Chicken Wings",
        price: 7.99,
        rate: 4.5,
        raters: 45,
        img: "https://images.unsplash.com/photo-1598257006929-706f8cb6eb6c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8c2VhcmNofDN8fGNoaWNrZW4lMjB3aW5nc3xlbnwwfHx8fDE2MjU0NDMyOTI&ixlib=rb-1.2.1&q=80&w=400",
        available: true,
      },
      {
        name: "Beef Burger",
        description: "Juicy Beef Burger",
        price: 8.99,
        rate: 4.7,
        raters: 60,
        img: "https://images.unsplash.com/photo-1597308698434-d0cdd6c8b8b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8c2VhcmNofDJ8fGJlZWYlMjBidXJnZXJ8ZW58MHx8fHwxNjI1NDQzMzM5&ixlib=rb-1.2.1&q=80&w=400",
        available: true,
      },
    ]);

    // Create categories
    const categories = await Category.insertMany([
      { name: "Starters", products: [products[0]._id, products[1]._id] },
      { name: "Mains", products: [products[2]._id, products[3]._id] },
    ]);

    // Create menus
    const menus = await Menu.insertMany([
      { categories: [categories[0]._id, categories[1]._id], user: users[0]._id },
      { categories: [categories[0]._id, categories[1]._id], user: users[1]._id },
    ]);

    // Create orders
    const orders = await Order.insertMany([
      {
        products: [{ product: products[0]._id, quantity: 2 }],
        table: tables[0]._id,
        totalPrice: products[0].price * 2,
      },
      {
        products: [{ product: products[1]._id, quantity: 1 }],
        table: tables[1]._id,
        totalPrice: products[1].price,
      },
    ]);

    console.log("Database seeded successfully!");

    mongoose.disconnect();
  } catch (error) {
    console.error("Error seeding database:", error);
    mongoose.disconnect();
  }
}

seedDatabase();
