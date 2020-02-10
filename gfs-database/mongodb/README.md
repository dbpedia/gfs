# Setup of GFS-Browser Database

Edit `setup` file and configure database psw, location, date, dumpfolder

Run setup
```
./setup
```

* downloads latest PreFusion
* start dockered mongodb
* mongoimport PreFusion
* index PreFusion
* mongoimport PreFusion context
