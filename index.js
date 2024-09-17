const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middlewer
app.use(cors());
app.use(express.json());



// console.log(process.env.DB_user);
// console.log(process.env.DB_pass);
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@learnmongo.htgdx.mongodb.net/?retryWrites=true&w=majority&appName=learnMongo`;

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





