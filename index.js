const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookeParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

/* middleware */
app.use(
  cors({
    origin: ["http://localhost:5173"], //for cookies
    credentials: true, //for cookies
  })
);
app.use(express.json());
app.use(cookeParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vv356rj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

/* nijer middleware */
const logger = async (req, res, next) => {
  console.log("called", req.host, req.originalUrl);
  next();
};

/* verify token */
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token in middleware", token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    // if token is valid then it would be decoded
    console.log("value in the token ", decoded);
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();

    const serviceCollection = client.db("car-doctor").collection("services"); // Fix here

    const bookingCollection = client.db("car-doctor").collection("bookings");

    /* Auth related api  */
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      /* token create korar process */
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: false, //http://localhost:5000
        sameSite: true,
      });

      res.send({ success: true });
    });

    /* find all service data */
    app.get("/services", logger, async (req, res) => {
      const cursor = serviceCollection.find(); // Fix here
      const result = await cursor.toArray();
      res.send(result);
    });

    /* find one service data  */
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      // Execute query
      const query = { _id: new ObjectId(id) };
      const options = {
        /* sob gulo data theke kon kon data api te pathabo seita filter korar jonne ei process */
        projection: { title: 1, service_id: 1, price: 1, image: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    //*.....................booking section start..................

    /* get bookings data from database */
    app.get("/bookings", logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      // console.log("tok tok token", req.cookies.token);
      console.log("user in the valid token", req.user);

      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      let query = {};
      /* jodi query er moddhe kono email theke tahole oi email er information gula show korbe only */
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    /* post bookings data to database */
    app.post("/bookings", async (req, res) => {
      const booking = req.body; // client site theke  ekhane info pabo eita use korle
      //   console.log("booking details", booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    /* Delete booking from database */

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      }; /* database er id er sahe mila lagbe . */
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    /* Data update function */
    app.patch("/bookings/:id", async (req, res) => {
      const updateBooking = req.body;
      console.log(updateBooking);
    });

    //*.....................booking section End..................

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

/* nije age eita kore nite hobe then mondodb theke uprer code copy kore ante hobe */
app.get("/", (req, res) => {
  res.send("car doctor server in running ");
});

app.listen(port, () => {
  console.log(`car doctor server is running on PORT : ${port}`);
});
