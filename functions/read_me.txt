The files under the /functions folder are for GCP-deployed cloud functions.  
They do not run on the client, they are called by the client and live as deployed callable functions

Inside index.js there is:
- getPatientCount:  counts patient information for the Anfi page (and others)
- updateStatusChange:  updates the firebase patients table to account for changes in status, doing some of the time stamp math.

