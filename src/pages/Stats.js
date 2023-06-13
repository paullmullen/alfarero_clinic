import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from './../helpers/firebaseConfig';

const Stats = () => {
  //const [serviceCounts, setServiceCounts] = useState([]);

  /*useEffect(() => {
    const fetchData = async () => {
      const patientsRef = collection(firestore, 'patients');
      const querySnapshot = await getDocs(patientsRef);
      const counts = {};

      querySnapshot.forEach((doc) => {
        const planOfCare = doc.data().plan_of_care;
        
        planOfCare.forEach((procedure) => {
          const station = procedure.station;
          
          if (station in counts) {
            counts[station].count++;
          } else {
            counts[station] = {
              count: 1,
              patients: []
            };
          }
          
          if (!counts[station].patients.includes(doc.id)) {
            counts[station].patients.push(doc.id);
          }
        });
      });

      const formattedCounts = Object.entries(counts).map(([station, data]) => ({
        station,
        count: data.count,
        patients: data.patients.length
      }));

      setServiceCounts(formattedCounts);
    };

    fetchData();
  }, []);*/

  return (
    <>
      <div>Stats</div>
    </>
  );
};

export default Stats;

