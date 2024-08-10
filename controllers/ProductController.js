const Product = require("../models/Product");
const Category = require("../models/Category");
const logger = require("../logger");
const cloudinary = require("cloudinary").v2; // Ensure cloudinary is properly configured in your project

const createProduct = async (req, res) => {
  try {
    const { name, description, price, img, available, categoryId } = req.body;

    // Upload product image to Cloudinary
    const uploadedImage = await cloudinary.uploader.upload(img, {
      public_id: `cafein-product_images/${name.trim()}`, // Use a meaningful identifier for the file name
      allowed_formats: ["jpg", "jpeg", "png"], // Allow only specific image formats
    });

    const newProduct = new Product({
      name,
      description,
      price,
      img: uploadedImage.secure_url, // Save the image URL
      available,
    });

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    category.products.push(newProduct._id);
    await category.save();
    await newProduct.save();

    logger.info(`Product ${name} created successfully`);
    res
      .status(201)
      .json({ message: "Product created successfully", product: newProduct });
  } catch (error) {
    logger.error("Error creating product:", error);
    res.status(500).json({ error: "Internal server error" });
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
  } catch (error) {
    logger.error(
      `Error deleting product with ID ${req.params.productId}:`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
};
