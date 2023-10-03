const Product = require("../models/product")
const User = require("../models/user")
const slugify = require("slugify")

exports.create = async (req, res) => {
  try {
    req.body.slug = slugify(req.body.title)
    const newProduct = await new Product(req.body).save()
    res.json(newProduct)
  } catch (err) {
    console.log(err)
    res.status(400).json({
      err: err.message,
    })
  }
}
exports.listAll = async (req, res) => {
  let products = await Product.find({})
    .limit(parseInt(req.params.count))
    .populate("category")
    .populate("subs")
    .sort([["createdAt", "desc"]])
    .exec()
  res.json(products)
}

exports.remove = async (req, res) => {
  try {
    const deleted = await Product.findOneAndRemove({
      slug: req.params.slug,
    }).exec()
    res.json(deleted)
  } catch (err) {
    console.log(err)
    return res.staus(400).send("Product delete failed")
  }
}

exports.read = async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate("category")
    .populate("subs")
    .exec()
  res.json(product)
}

exports.update = async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title)
    }
    const updated = await Product.findOneAndUpdate(
      { slug: req.params.slug },
      req.body,
      { new: true }
    ).exec()
    res.json(updated)
  } catch (err) {
    console.log("PRODUCT UPDATE ERROR ----> ", err)
    // return res.status(400).send("Product update failed");
    res.status(400).json({
      err: err.message,
    })
  }
}

exports.list = async (req, res) => {
  try {
    // createdAt/updatedAt, desc/asc, 3
    const { sort, order, limit } = req.body
    const products = await Product.find({})
      .populate("category")
      .populate("subs")
      .sort([[sort, order]])
      .limit(limit)
      .exec()

    res.json(products)
  } catch (err) {
    console.log(err)
  }
}

exports.productStar = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.productId })
  const user = await User.findOne({ email: req.user.email }).exec()

  const { star } = req.body

  if (!user) {
    return res.status(404).json({ error: "User not found" })
  }
  if (!product) {
    return res.status(404).json({ error: "Product not found" })
  }

  // Check if the user has already rated this product
  const existingRatingIndex = product.ratings.findIndex(
    (r) => r.postedBy.toString() === user._id.toString()
  )

  if (existingRatingIndex === -1) {
    product.ratings.push({ star, postedBy: user._id })
    await product.save()
  } else {
    product.ratings[existingRatingIndex].star = star
    await product.save()
  }

  res.json({ messageCode: "PRR01", message: "Product Rating Updated" })
}

exports.listRelated = async (req, res) => {
  const product = await Product.findById(req.params.productId).exec()

  const related = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
  })
    .limit(3)
    .populate("category")
    .populate("subs")
    .exec()

  res.json(related)
}

const handleQuery = async (req, res, query) => {
  const products = await Product.find({ $text: { $search: query } })
    .populate("category", "_id name")
    .populate("subs", "_id name")
    // .populate("postedBy", "_id name")
    .exec()

  res.json(products)
}

const handlePrice = async (req, res, price) => {
  try {
    let products = await Product.find({
      price: {
        $gte: price[0],
        $lte: price[1],
      },
    })
      .populate("category", "_id name")
      .populate("subs", "_id name")
      // .populate("postedBy", "_id name")
      .exec()

    res.json(products)
  } catch (err) {
    console.log(err)
  }
}

exports.searchFilters = async (req, res) => {
  const { query, price } = req.body

  if (query) {
    console.log("query", query)
    await handleQuery(req, res, query)
  }
  // price [20, 200]
  if (price !== undefined) {
    console.log("price ---> ", price)
    await handlePrice(req, res, price)
  }
}
