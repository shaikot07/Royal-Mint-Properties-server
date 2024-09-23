const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken')

var admin = require("firebase-admin");

var serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);

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
        // await client.connect();
        // Send a ping to confirm a successful connection
        // our Custom code start for crud 
        const userCollection = client.db('Royal-Mint-Properties').collection('users');
        const postCollection = client.db('Royal-Mint-Properties').collection('blog');


        // Firebase admin Start Here
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log("Firebase admin initialized successfully.");
        // Firebase admin End Here

        // Test api to load all user form firebase
        app.get('/firebase/users', async (req, res) => {
            const users = [];
            const listUsersResult = await admin.auth().listUsers(1000);
            listUsersResult.users.forEach((userRecord) => {
                users.push(userRecord.toJSON());
            });
            res.status(200).json(users);
        })

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
            res.send(result)
        });

        // Load user with pagination

        app.post('/addUser', async (req, res) => {
            const { email, password, firstName, lastName, address, image, imagePublicId } = req.body;
            console.log(email, password, firstName, lastName, address, image, imagePublicId);

            try {
                // Create user as Firebase Admin 
                const userRecord = await admin.auth().createUser({
                    email,
                    password,
                    displayName: `${firstName} ${lastName}`
                });

                // Optionally, store additional user data in your MongoDB
                const userData = {
                    firstName,
                    lastName,
                    address,
                    email,
                    image,
                    firebaseId: userRecord.uid,
                    imagePublicId
                };

                const result = await userCollection.insertOne(userData);

                res.status(201).send({ insertedId: result.insertedId });
            } catch (error) {
                console.error('Error adding user:', error);
                res.status(500).send({ message: 'Failed to add user', error });
            }
        });

        app.get('/users', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const result = await userCollection.find().skip(page * size).limit(size).toArray();
            res.send(result);
        })

        //load total user for pagination
        app.get('/totalUsers', async (req, res) => {
            const totalUser = await userCollection.estimatedDocumentCount();
            res.send({ totalUser });
        })

        // Delete User
        // app.delete('/users/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) };
        //     const result = await userCollection.deleteOne(query);
        //     res.send(result);
        // })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const user = await userCollection.findOne({ _id: new ObjectId(id) });

            if (!user) {
                return res.status(404).send({ message: "user not found" });
            }

            // Delete the user from firebase
            await admin.auth().deleteUser(user.firebaseId)

            // Delete the user from mongodb
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });



        // Update User
        app.put('/users/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };

            const updatedUser = {
                $set: {
                    firstName: data?.firstName,
                    lastName: data?.lastName,
                    address: data?.address
                }
            }

            const updateUser = await userCollection.updateOne(query, updatedUser, options);
            res.json(updateUser);
        });

        // Create a new post
        app.post('/api/blog', async (req, res) => {
            const post = req.body;
            try {
                const result = await postCollection.insertOne(post);
                res.status(201).send(result);
            } catch (error) {
                res.status(500).send({ error: 'Error creating post' });
            }
        });

        // Get all posts
        app.get('/api/blog', async (req, res) => {
            try {
                const posts = await postCollection.find().toArray();
                res.status(200).send(posts);
            } catch (error) {
                res.status(500).send({ error: 'Error fetching posts' });
            }
        });
        app.get('/api/blogs', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const result = await postCollection.find().skip(page * size).limit(size).toArray();
            res.send(result);
        })

        // Get a post by ID
        app.get('/api/blog/:id', async (req, res) => {
            try {
                const post = await postCollection.findOne({ _id: ObjectId(req.params.id) });
                if (!post) {
                    return res.status(404).send({ error: 'Post not found' });
                }
                res.status(200).send(post);
            } catch (error) {
                res.status(500).send({ error: 'Error fetching post' });
            }
        });

        // Get a blog updated  by ID
        app.patch('/api/blog/:id', async (req, res) => {
            const item = req.body;
            console.log(item);
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    // ---------
                    title: item.title,
                    content: item.content,
                    image: item.updatedImageUrl,
                    seoKeyWord: item.seoKeyWord
                }
            }

            const result = await postCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.delete('/api/blog/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await postCollection.deleteOne(query);
            res.send(result)
        })

        // our Custom code end for crud 
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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





