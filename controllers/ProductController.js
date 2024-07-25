const Product = require("../models/Product");
const cloudinary = require("cloudinary").v2; // Ensure cloudinary is properly configured in your project
const logger = require("../logger"); // Import the logger

const createProduct = async (req, res) => {
  try {
    const { name, description, rate, price, raters, img, available } = req.body;

    // Validate required fields
    if (!name || !description || !price) {
      logger.warn("Name, description, and price are required");
      return res.status(400).json({ error: "Name, description, and price are required" });
    }

    // Check if a product with the same name already exists
    const existingProduct = await Product.findOne({ name });

    if (existingProduct) {
      logger.warn(`Product with name ${name} already exists`);
      return res.status(400).json({ error: "Product with this name already exists" });
    }

    // Upload product image to Cloudinary if img is provided
    let imageUrl = "";
    if (img) {
      const uploadedImage = await cloudinary.uploader.upload(img, {
        public_id: `CafeInProduct/${name.trim()}`, // Use a meaningful identifier for the file name
        allowed_formats: ["jpg", "jpeg", "png"], // Allow only specific image formats
      });
      imageUrl = uploadedImage.secure_url;
      logger.info(`Image uploaded to Cloudinary for product ${name}`);
    }

    // Create a new Product instance
    const newProduct = new Product({
      name,
      description,
      rate,
      price,
      raters,
      img: imageUrl,
      available,
    });

    // Save the new product to the database
    await newProduct.save();

    logger.info(`Product ${name} created successfully`);
    res.status(201).json({ message: "Product created successfully", product: newProduct });
  } catch (error) {
    logger.error("Error creating product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }); // Sort by creation date in descending order

    if (!products || products.length === 0) {
      logger.warn("No products found");
      return res.status(404).json({ error: "No products found" });
    }

    logger.info("Fetched all products");
    res.status(200).json(products);
  } catch (error) {
    logger.error("Error fetching all products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      logger.warn(`Product with ID ${id} not found`);
      return res.status(404).json({ error: "Product not found" });
    }
    logger.info(`Fetched product with ID ${id}`);
    res.status(200).json(product);
  } catch (error) {
    logger.error(`Error fetching product with ID ${id}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    // Find the product by ID
    const product = await Product.findById(productId);
    if (!product) {
      logger.warn(`Product with ID ${productId} not found`);
      return res.status(404).json({ error: "Product not found" });
    }

    // Extract the public ID from the Cloudinary URL
    const publicId = product.img.split("/").pop().split(".")[0];

    // Delete the product from the database
    await Product.findByIdAndDelete(productId);

    // Delete the image from Cloudinary
    await cloudinary.uploader.destroy(`product_images/${publicId}`);

    logger.info(`Product with ID ${productId} deleted successfully`);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting product with ID ${productId}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params; // Use req.params to get the product ID
    const { name, description, rate, price, raters, img, available } = req.body;

    let updateData = {
      name,
      description,
      rate,
      price,
      raters,
      available,
    };

    // If there's a new image, upload it to Cloudinary
    if (img) {
      const uploadedImage = await cloudinary.uploader.upload(img, {
        public_id: `product_images/${productId}`, // Use product ID for the file name
        allowed_formats: ["jpg", "jpeg", "png"], // Allow only specific image formats
        overwrite: true, // Overwrite the existing image with the same public_id
        invalidate: true, // Invalidate the old image in the CDN cache
      });
      updateData.img = uploadedImage.secure_url; // Save the new image URL
      logger.info(`Image updated in Cloudinary for product ${name}`);
    }

    const product = await Product.findByIdAndUpdate(productId, updateData, {
      new: true,
    });
    if (!product) {
      logger.warn(`Product with ID ${productId} not found`);
      return res.status(404).json({ error: "Product not found" });
    }
    logger.info(`Product with ID ${productId} updated successfully`);
    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    logger.error(`Error updating product with ID ${productId}:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProduct,
  deleteProduct,
  updateProduct,
};
