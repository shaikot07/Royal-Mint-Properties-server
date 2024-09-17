const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken')

// middlewer
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@learnmongo.htgdx.mongodb.net/?retryWrites=true&w=majority&appName=learnMongo`;

// VerifyToken middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoad) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized' })
        }

        req.decode = decoad;
        const email = decoad.email;
        req.role = email;

        next();
    })
}



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        // our Custom code start for crud 
        const userCollection = client.db('Royal-Mint-Properties').collection('users');


        // sign In
        app.post('/signIn', async (req, res) => {
            const { email, uid } = req.body;
            const token = jwt.sign({ email, uid }, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
            res.send({ status: '200', token });
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert email if user  dose't exists 
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        // our Custom code end for crud 
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('simple CRUD server is RUNNING')
})

app.listen(port, () => {
    console.log(`simple CRUD is Running on port,${port}`);
})





