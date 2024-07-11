const mongoose = require("mongoose");
const Product = require("./models/Product");
const Category = require("./models/Category");
const Menu = require("./models/Menu");
const User = require("./models/User");

async function addNewCategoriesAndProductsForUser(email) {
  try {
    // Connect to the database
    await mongoose.connect(
      "mongodb+srv://saadliwissem88:12715083w@cafein.ctsilpo.mongodb.net/?retryWrites=true&w=majority&appName=CafeIn",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    // Find the menu associated with the user
    const menu = await Menu.findOne({ user: user._id });
    if (!menu) {
      throw new Error("Menu not found");
    }

    // Create new products
    const newProducts = [
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
    ];
    const insertedNewProducts = await Product.insertMany(newProducts);

    // Create new categories
    const newCategories = [
      { name: "Mains", products: insertedNewProducts.map((p) => p._id) },
    ];
    const insertedNewCategories = await Category.insertMany(newCategories);

    // Update the menu to include the new categories
    menu.categories = menu.categories.concat(
      insertedNewCategories.map((c) => c._id)
    );
    await menu.save();

    console.log("New categories and products added successfully!");

    // Disconnect from the database
    mongoose.disconnect();
  } catch (error) {
    console.error("Error adding new categories and products:", error);
    mongoose.disconnect();
  }
}

// Call the function to add new categories and products for the specified user
addNewCategoriesAndProductsForUser("john@example.com");
