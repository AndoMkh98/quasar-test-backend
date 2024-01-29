const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const {LocalStorage} = require('node-localstorage');
const { v4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const expressjwt  = require('express-jwt');

const cors = require('cors')

global.localStorage = new LocalStorage('./data')


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        // Generate a unique filename for each uploaded file
        const uniqueFilename = file.originalname;
        cb(null, uniqueFilename);
    },
});
const upload = multer({ storage });

// Serve your static files (images, etc.) from a 'public' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors())
app.use(bodyParser.json());
app.use(express.json())

app.post('/users/login', (req,res) =>{
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(item => item.userName === req.body.userName)

    if(!user) {
        res.status(400).send('The user does not exist');
    }

    if(user.password !== req.body.password) {
        res.status(400).send('The password is incorrect')
    }


    res.status(201).send({
        user,
        accessToken: jwt.sign({id: user.id}, 'secret')
    })

})
app.post('/users/register', (req, res) => {
    const users = JSON.parse(localStorage.getItem('users'));

    if(users.find(item => item.email === req.body.email)) {
        res.status(400).send('The user already exists');
    }
    const id = v4()
    const newUser = {
        ...req.body,
        id
    }

    localStorage.setItem('users', JSON.stringify(users.concat(newUser)))
    res.send({
        user: newUser,
        accessToken: jwt.sign({id}, 'secret')
    })
})

app.get('/events', (req, res) => {
    res.send(localStorage.getItem('events'))
})

const jwtMiddleware = expressjwt({ secret: 'secret', algorithms: ['HS256'], })
app.post('/events',
    upload.fields([{
        name: 'files',
    }, {
        name:  'body'
    }]), jwtMiddleware, (req, res) => {
        const files = req.files.files

    const { id } = req.user;
        const body = JSON.parse(req.body.body)
    const user = JSON.parse(localStorage.getItem('users')).find(item => item.id === id)
    const newEvent = {
        ...body,
        id: v4(),
        files: files.map(item => `http://localhost:8085/uploads/${item.originalname}`),
        createdAt: body.createdAt || new Date(),
        user
    }

    localStorage.setItem('events', JSON.stringify(JSON.parse(localStorage.getItem('events')).concat(newEvent)))
    res.send(newEvent)
})




app.patch('/events/:id', (req, res) => {
    const events = JSON.parse(localStorage.getItem('events'));
    const newEvents = events.map(item => item.id === req.params.id ? ({
        ...item,
        ...req.body
    }) : item)
    localStorage.setItem('events', JSON.stringify(newEvents))
    res.send(newEvents)
})


app.delete('/events/:id', (req, res) => {
    const events = JSON.parse(localStorage.getItem('events'));
    localStorage.setItem('events', JSON.stringify(events.filter(item => item.id !== req.params.id)))
    res.status(204).send();
})

app.listen(8085, () => {
    const users = JSON.parse(localStorage.getItem('users'))
    const events = JSON.parse(localStorage.getItem('events'))
    if(!Array.isArray(users) || users.length === 0) {
        localStorage.setItem('users', JSON.stringify([]))
    }

    if(!Array.isArray(events) || events.length === 0) {
        localStorage.setItem('events', JSON.stringify([]))
    }

    console.log('The server has been started at port 8085')
})