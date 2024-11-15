const Category = require("../models/Category");
const Product = require("../models/Product");
const logger = require("../logger");
const Menu = require("../models/Menu");

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const superClientId = req.superClientId;

    // Create a new category
    const newCategory = new Category({ name });
    await newCategory.save();

    // Find the menu associated with the superClientId
    const menu = await Menu.findOne({ user: superClientId });

    if (!menu) {
      return res.status(404).json({ error: "Menu not found" });
    }

    // Add the new category to the menu
    menu.categories.push(newCategory._id);
    await menu.save();

    logger.info(`Category ${name} created and added to menu successfully`);

    res.status(201).json({
      message: "Category created and added to menu successfully",
      category: newCategory,
    });
  } catch (error) {
    logger.error("Error creating category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate("products");
    res.status(200).json(categories);
  } catch (error) {
    logger.error("Error fetching categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name } = req.body;

    const category = await Category.findByIdAndUpdate(
      categoryId,
      { name },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    logger.info(`Category with ID ${categoryId} updated successfully`);
    res
      .status(200)
      .json({ message: "Category updated successfully", category });
  } catch (error) {
    logger.error(
      `Error updating category with ID ${req.params.categoryId}:`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Find the category by ID
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Remove all products in the category
    await Product.deleteMany({ _id: { $in: category.products } });

    // Delete the category itself
    await Category.findByIdAndDelete(categoryId);

    // Update the Menu to remove the category ID from the categories array
    await Menu.updateMany(
      { categories: categoryId },
      { $pull: { categories: categoryId } }
    );

    logger.info(
      `Category with ID ${categoryId} deleted successfully and removed from associated menus`
    );
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    logger.error(
      `Error deleting category with ID ${req.params.categoryId}:`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const category = await Category.findById(categoryId).populate("products");
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(200).json(category);
  } catch (error) {
    logger.error(
      `Error fetching category with ID ${req.params.categoryId}:`,
      error
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  getCategoryById,
};
