# Setup of GFS-Browser Database

> **Requirements:** bash, wget, [python3](https://www.python.org/downloads/), [docker](https://docs.docker.com/install/)

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
