const defaultSort = (a, b) => {
    console.log(a, b);
    if (a.patient_name < b.patient_name) return -1;
    if (b.patient_name < a.patient_name) return 1;
    return 0;
  };

  export { defaultSort }

  