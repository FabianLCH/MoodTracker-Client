import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import axios from "axios";

import { moodColorMapping } from "../utils/pieConfigOptions";

const barChartOptions = {
    responsive: true,
    legend: { display: false },
    layout: { padding: 10 },
    scales: {
        xAxes: [{
            ticks: {
                fontColor: "#3E2312",
                fontSize: 17 
            },
            gridLines: { 
                display: false, 
                color: "rgba(0, 0, 0, 0.2)" 
            }
        }],
        yAxes: [{
            display: false,
            ticks: {
                min: 0,
                stepSize: 1,
                fontColor: "rgba(0, 0, 0, 1)" },
            gridLines: { 
                display: false, 
                color: "rgba(0, 0, 0, 0.2)" 
            }
        }]
    }
}

// fetch mood tally counts from database
const fetchMoodData = (updateDataFunction) => {
    return axios.get("/api/moods/today").then(
        (resp) => {
            let { moods } = resp.data.data;

            let moodLabels = [];
            let moodColors = [];
            let moodTallies = [];

            moods.forEach( mood => {
                moodLabels.push(mood.name);
                moodColors.push( moodColorMapping[mood.name] || "#FFFFFF" );
                moodTallies.push(mood.tally);
            })

            let barData = {
                labels: moodLabels,
                datasets: [{
                    label: "Tally Count",
                    backgroundColor: moodColors,
                    data: moodTallies
                }]
            };

            updateDataFunction(barData);
        }
    );
};

const statusMessageMapping = {
    0: {statusMessage: "Getting data from database..."},
    1: {statusMessage: "Connected to database.", iconClass: "fas fa-check"},
    2: {statusMessage: "Oh no! We couldn't fetch the data. Please try again in a bit.", iconClass: "fas fa-exclamation"},
    3: {statusMessage: "Connection lost.", iconClass: "fas fa-times"}
}

const MoodBarChartContainer = (props) => {
    
    const [ connectionStatus, setConnectionStatus ] = useState(0);
    const [ dataSelect, setDataSelect ] = useState({isToday: true, index: 0});
    const [ todayData, setTodayData ] = useState({});
    const [ prevDataList, populatePrevDataList ] = useState([]);

    useEffect(() => {
        let updateInterval;
        // get today's mood data
        fetchMoodData(setTodayData).then(() => {

            setConnectionStatus(1);
            // then get previous data (only executed at start as old data will not change)
            return axios.get("/api/moods/previous"); 
        }).then((resp) => {
            let tallyArray = resp.data.data;
            let formattedTallyArray = tallyArray.map( (entry, index) => {
                let prevMoodLabels = [];
                let prevMoodColors = [];
                let prevMoodTallies = [];
                
                // put data into separate arrays
                entry.moods.forEach( mood => {
                    prevMoodLabels.push(mood.name);
                    prevMoodColors.push( moodColorMapping[mood.name] || "#FFFFFF" );
                    prevMoodTallies.push(mood.tally);
                });
                
                let { date } = entry;
                let dateString = `${date.year}-${date.month}-${date.day}`;
                // return formatted data
                return {
                    entryDate: dateString,
                    arrIndex: index,
                    labels: prevMoodLabels,
                    datasets: [{
                        label: "Tally Count",
                        backgroundColor: prevMoodColors,
                        data: prevMoodTallies }]
                    }
            });

            // add formatted data for previous dates to state
            populatePrevDataList(formattedTallyArray);

            // set the update interval
            updateInterval = setInterval( () => { 
                
                fetchMoodData(setTodayData).catch( error => {
                        setConnectionStatus(3);
                }) }, 10000);
        }).catch( (err) => {
            setConnectionStatus(2);
            console.log("Could not fetch data.\n", err);
        });

        // fetch data every 10s

        // on unmount, clear interval to stop callbacks if it was created
        return () => {
            if(updateInterval)
                clearInterval(updateInterval); 
            }; 
    }, []);

    let { statusMessage, iconClass } = statusMessageMapping[connectionStatus];
    return (
    <div className="outer-bar-chart-container">
        <div className="inner-bar-chart-container">
            <div className="bar-chart-top">{dataSelect.isToday ? "How is everyone else feeling?" : "How did everyone else feel?"}<a href="/"><button><i className="fas fa-angle-left"></i> Back to mood pie</button></a></div>
            <div className="status-message" ><i className={iconClass || "fas fa-circle"}></i> {statusMessage}</div>
            <Bar 
                data={dataSelect.isToday ? todayData : prevDataList[dataSelect.index]}
                options={barChartOptions}
            />
            <div className="bottom-controls">
                <label htmlFor="date-select">Select a date:</label>
                <select id="date-select" onChange={ (e) => { 
                    let { value } = e.target;
                    value < 0 ? setDataSelect({isToday: true, index: 0}) : setDataSelect({isToday: false, index: value});
                }}>
                    <option key={0} value={-1}>Today</option>
                    { prevDataList.map( oldEntry => <option key={oldEntry.arrIndex + 1} value={oldEntry.arrIndex}>{oldEntry.entryDate}</option> )}
                </select>
            </div>
        </div>
    </div>
    );
};

export default MoodBarChartContainer;