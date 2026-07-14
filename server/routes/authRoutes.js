const express = require("express");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

//signup
router.post("/signup", async(req, res)=>{
    const {name, email, password} = req.body;
    const existingEmail = await User.findOne({email});
    if(existingEmail) return res.status(400).json({message : "User exists"});

    const hashed = await bcryptjs.hash(password, 10);
    const user = await User.create({name, email, password:hashed});
    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn : "7d"});

    res.status(201).json({user : {id: user._id}, token})
})

//login
router.post("/login", async(req, res)=>{
    const {email, password} = req.body;
    const existingEmail = await User.findOne({email});
    if(!existingEmail) return res.status(404).json({message : "User not found"});

    const match = await bcryptjs.compare(password, user.password);
    if(!match) return res.status(400).json({message : "Invalid login details"});

    const token = jwt.sign({id : user._id}, process.env.JWT_SECRET, {expiresIn : "7d"});

    res.json({user : {id : user._id}, token})
})

module.exports = router