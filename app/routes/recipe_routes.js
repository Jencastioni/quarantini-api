// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for recipe
const Recipe = require('../models/recipe')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { recipe: { title: '', body: 'foo' } } -> { recipe: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /recipes
router.get('/recipe', requireToken, (req, res, next) => {
    const owner = req.user.id
    Recipe.find({owner: owner})
    .then(recipes => {
      // `recipe` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return recipes.map(recipes => recipes.toObject())
    })
    // respond with status 200 and JSON of the recipe
    .then(recipes => res.status(200).json({ recipes: recipes }))
    // if an error occurs, pass it to the handler
    .catch(next)
})
//TOKEN="b8b0691a9816b64f475e2dab61850a4f" sh curl-scripts/recipe/index.sh


// SHOW
// GET /recipe/5a7db6c74d55bc51bdf39793
router.get('/recipe/:id', requireToken, (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  Recipe.findById(req.params.id)
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "recipe" JSON
    .then(recipe => res.status(200).json({ recipe: recipe.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(next)
})
// ID=5f2ad964b9b13ce76aecc4c3 TOKEN="b8b0691a9816b64f475e2dab61850a4f" sh curl-scripts/recipe/show.sh

// CREATE
// POST /recipe
router.post('/recipe', requireToken, (req, res, next) => {
  // set owner of new recipe to be current user
  req.body.recipe.owner = req.user.id

  Recipe.create(req.body.recipe)
    // respond to succesful `create` with status 201 and JSON of new "recipe"
    .then(recipe => {
      res.status(201).json({ recipe: recipe.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// TOKEN="b8b0691a9816b64f475e2dab61850a4f" TEXT="My recipe" TITLE="Recipe1" sh curl-scripts/recipe/create.sh

// UPDATE
// PATCH /recipe/5a7db6c74d55bc51bdf39793
router.patch('/recipe/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.text.recipe.owner

  Recipe.findById(req.params.id)
    .then(handle404)
    .then(recipe => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, recipe)
        // cant update unless you own the ID

      // pass the result of Mongoose's `.update` to the next `.then`
      return recipe.updateOne(req.text.recipe)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})
// ID=5f2ad964b9b13ce76aecc4c3 TOKEN="b8b0691a9816b64f475e2dab61850a4f" TEXT="My FIRST recipe" sh curl-scripts/recipe/update.sh


// DESTROY
// DELETE /recipe/5a7db6c74d55bc51bdf39793
router.delete('/recipe/:id', requireToken, (req, res, next) => {
  Recipe.findById(req.params.id)
    .then(handle404)
    .then(recipe => {
      // throw an error if current user doesn't own `recipe`
      requireOwnership(req, recipe)
      // delete the recipe ONLY IF the above didn't throw
      recipe.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})
// ID=5f2ad964b9b13ce76aecc4c3 TOKEN="b8b0691a9816b64f475e2dab61850a4f" sh curl-scripts/recipe/destroy.sh

module.exports = router
