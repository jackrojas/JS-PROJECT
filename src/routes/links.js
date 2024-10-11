const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = require('../database');
const { isLoggedIn } = require('../lib/auth');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'src/public/img'); // Directorio donde se almacenarán las imágenes
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get('/add', (req, res) => {
    res.render('links/add');
});

router.post('/add', upload.single('image'), async (req, res) => {
    const { title, description } = req.body;
    const url = req.file.filename; // Obtén el nombre del archivo de la imagen
    const newLink = {
        title,
        description,
        url,
        user_id: req.user.id
    };
    await pool.query('INSERT INTO links SET ?', [newLink]);
    req.flash('success', 'Link Saved Successfully');
    res.redirect('/links');
});

router.get('/', isLoggedIn, async (req, res) => {
    const links = await pool.query('SELECT * FROM links WHERE user_id = ?', [req.user.id]);
    res.render('links/list', { links });
});

router.get('/delete/:id', async (req, res) => {
    const { id } = req.params;
    const link = await pool.query('SELECT url FROM links WHERE id = ?', [id]);
    if (link.length > 0) {
        const imagePath = path.join(__dirname, '..', 'src', 'public', 'img', link[0].url);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath); // Borra la imagen del servidor
        } else {
            console.log("El archivo no existe en la ruta especificada:", imagePath);
        }
    }
    await pool.query('DELETE FROM links WHERE id = ?', [id]);
    req.flash('success', 'Link Removed Successfully');
    res.redirect('/links');
});

router.get('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const link = await pool.query('SELECT * FROM links WHERE id = ?', [id]);
    res.render('links/edit', { link: link[0] });
});

router.post('/edit/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const updateLink = { title, description };

    if (req.file) {
        updateLink.url = req.file.filename;
        const oldLink = await pool.query('SELECT url FROM links WHERE id = ?', [id]);
        if (oldLink.length > 0) {
            const imagePath = path.join(__dirname, '..', 'src', 'public', 'img', oldLink[0].url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            } else {
                console.log("El archivo no existe en la ruta especificada:", imagePath);
            }
        }
    }

    await pool.query('UPDATE links SET ? WHERE id = ?', [updateLink, id]);
    req.flash('success', 'Link Updated Successfully');
    res.redirect('/links');
});

module.exports = router;
