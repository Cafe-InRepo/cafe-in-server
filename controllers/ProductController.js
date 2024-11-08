const Product = require("../models/Product");
const Category = require("../models/Category");
const Menu = require("../models/Menu");

const logger = require("../logger");
const cloudinary = require("cloudinary").v2; // Ensure cloudinary is properly configured in your project

const createProduct = async (req, res) => {
  try {
    const { name, description, price, img, available, categoryId } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: "Product name is required" });
    }
    if (!description) {
      return res.status(400).json({ error: "Product description is required" });
    }
    if (!price) {
      return res.status(400).json({ error: "Product price is required" });
    }
    if (!img) {
      return res.status(400).json({ error: "Product image is required" });
    }
    if (!categoryId) {
      return res.status(400).json({ error: "Category ID is required" });
    }

    // Upload product image to Cloudinary
    const uploadedImage = await cloudinary.uploader.upload(img, {
      public_id: `cafein-product_images/${name.trim()}`, // Use a meaningful identifier for the file name
      allowed_formats: ["jpg", "jpeg", "png"], // Allow only specific image formats
    });

    // Create the new product
    const newProduct = new Product({
      name,
      description,
      price,
      img: uploadedImage.secure_url, // Save the image URL
      available,
    });

    // Find the category and add the product to it
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    category.products.push(newProduct._id);
    await category.save();
    await newProduct.save();

    // Emit an event to notify product updates
    req.io.emit("productUpdated");

    logger.info(`Product ${name} created successfully`);
    return res
      .status(201)
      .json({ message: "Product created successfully", product: newProduct });
  } catch (error) {
    logger.error("Error creating product:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description, price, img, available } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // If a new image is uploaded, handle the Cloudinary upload and delete the old image
    let updatedImg = product.img;
    if (img && img !== product.img) {
      // Upload the new image to Cloudinary
      const uploadedImage = await cloudinary.uploader.upload(img, {
        public_id: `cafein-product_images/${name.trim()}`, // Use a meaningful identifier for the file name
        allowed_formats: ["jpg", "jpeg", "png"], // Allow only specific image formats
      });

      updatedImg = uploadedImage.secure_url;

      // Delete the old image from Cloudinary
      const oldImagePublicId = product.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(
        `cafein-product_images/${oldImagePublicId}`
      );
    }

    product.name = name;
    product.description = description;
    product.price = price;
    product.img = updatedImg;
    product.available = available;

    await product.save();
    req.io.emit("productUpdated");
    logger.info(`Product with ID ${productId} updated successfully`);
    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    logger.error(
      `Error updating product with ID ${req.params.productId}:`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete the image from Cloudinary
    const imagePublicId = product.img.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(`cafein-product_images/${imagePublicId}`);

    await Product.findByIdAndDelete(productId);

    // Remove the product reference from the category
    await Category.updateMany({}, { $pull: { products: productId } });

    logger.info(`Product with ID ${productId} deleted successfully`);
    res.status(200).json({ message: "Product deleted successfully" });
    req.io.emit("productUpdated");
  } catch (error) {
    logger.error(
      `Error deleting product with ID ${req.params.productId}:`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

const getMenuProducts = async (req, res) => {
  try {
    const userId = req.superClientId;

    // Find the menu for the given userId and populate categories and their products
    const menu = await Menu.findOne({ user: userId }).populate({
      path: "categories",
      populate: {
        path: "products",
        model: "Product",
      },
    });

    if (!menu) {
      return res.status(404).json({ message: "Menu not found for this user" });
    }

    // Extract all products from the populated categories
    const products = menu.categories.flatMap((category) => category.products);

    return res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching menu products:", err);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};
const changeProductAvailability = async (req, res) => {
  try {
    const { productId } = req.params;
    const { available } = req.body;

    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Update the availability status
    product.available = available;

    // Save the updated product
    await product.save();
    req.io.emit("productUpdated");

    // Log the change
    logger.info(
      `Product with ID ${productId} availability updated to ${available}`
    );

    res
      .status(200)
      .json({ message: "Product availability updated successfully", product });
  } catch (error) {
    logger.error(
      `Error updating availability for product with ID ${req.params.productId}:`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};
const getProductRatingsBySuperClient = async (req, res) => {
  const superClientId = req.superClientId; // Assuming this is set by middleware

  try {
    // Find the menu for the given superClient
    const menu = await Menu.findOne({ user: superClientId }).populate({
      path: 'categories',
      populate: {
        path: 'products',
        model: 'Product',
      },
    });

    if (!menu) {
      return res.status(404).json({ message: 'Menu not found for this superClient' });
    }

    // Extract product ratings from the menu
    const productRatings = [];
    menu.categories.forEach((category) => {
      category.products.forEach((product) => {
        productRatings.push({
          productId: product._id,
          productName: product.name,
          rate: product.rate,
          raters: product.raters,
          price: product.price,
        });
      });
    });

    res.status(200).json(productRatings);
  } catch (error) {
    console.error('Error retrieving product ratings:', error);
    res.status(500).json({ message: 'Failed to retrieve product ratings', error: error.message });
  }
};


module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getMenuProducts,
  changeProductAvailability,
  getProductRatingsBySuperClient
};
