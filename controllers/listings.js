const Listing = require("../models/listing");
const axios = require("axios");

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", {allListings});
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs")
};

module.exports.showListing = async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id).populate({path: "reviews", populate: {path: "author"}}).populate("owner");
    if(!listing){
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    console.log(listing);
    res.render("listings/show.ejs", {listing});
};

module.exports.createListing = async (req, res) => {
    let url = req.file.path;
    let filename = req.file.filename;

    const { location, country } = req.body.listing;
    const geoRes = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
            params: {
                address: `${location}, ${country}`,
                key: process.env.MAP_TOKEN
            }
        }
    );

    if (!geoRes.data.results.length) {
        req.flash("error", "Invalid location");
        return res.redirect("/listings/new");
    }

    const { lat, lng } = geoRes.data.results[0].geometry.location;


    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = {url, filename};

    newListing.geometry = {
        type: "Point",
        coordinates: [lng, lat]
    };

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/c_fill,h_300,w_250");
    res.render("listings/edit.ejs", {listing, originalImageUrl});
};

module.exports.updateListing = async (req, res) => {  
    let {id} = req.params;
    let listing = await Listing.findByIdAndUpdate(id);
    listing.set(req.body.listing);

    if (req.body.listing.location || req.body.listing.country) {
        const { location, country } = req.body.listing;

        const geoRes = await axios.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            {
                params: {
                    address: `${location}, ${country}`,
                    key: process.env.MAP_TOKEN
                }
            }
        );

        if (!geoRes.data.results.length) {
            req.flash("error", "Invalid location");
            return res.redirect(`/listings/${id}/edit`);
        }

        const { lat, lng } = geoRes.data.results[0].geometry.location;

        listing.geometry = {
            type: "Point",
            coordinates: [lng, lat]
        };
    }

    if(typeof req.file !== "undefined"){
        listing.image =  {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    await listing.save();
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};
