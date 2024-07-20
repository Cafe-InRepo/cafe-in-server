const Menu = require("../models/Menu");

// Create a new menu
const createMenu = (req, res) => {
  Menu.findOne({ user: req.userId })
    .then((existingMenu) => {
      if (existingMenu) {
        return res.status(400).json({ error: "Client already has a menu" });
      }

      const newMenu = new Menu({
        categories: req.body.categories,
        user: req.userId,
      });

      newMenu
        .save()
        .then((menu) => res.status(201).json(menu))
        .catch((error) => res.status(500).json({ error: error.message }));
    })
    .catch((error) => res.status(500).json({ error: error.message }));
};

// Get the menu for the authenticated user
const getMenu = (req, res) => {
  Menu.findOne({ user: "669ae52606c579379345b7cf" })
    .populate({
      path: "categories",
      populate: {
        path: "products",
        model: "Product",
      },
    })
    .then((menu) => {
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.json(menu);
    })
    .catch((error) => res.status(500).json({ error: error.message }));
};

// Update the menu for the authenticated user
const updateMenu = (req, res) => {
  Menu.findOneAndUpdate({ user: req.userId }, req.body, { new: true })
    .then((menu) => {
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.json(menu);
    })
    .catch((error) => res.status(500).json({ error: error.message }));
};

// Delete the menu for the authenticated user
const deleteMenu = (req, res) => {
  Menu.findOneAndDelete({ user: req.userId })
    .then((menu) => {
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.status(204).send();
    })
    .catch((error) => res.status(500).json({ error: error.message }));
};

module.exports = {
  createMenu,
  getMenu,
  updateMenu,
  deleteMenu,
};
