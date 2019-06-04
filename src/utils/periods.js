import moment from "moment";

export function buildAllPossiblePeriods(periodType, startYear, endYear) {
    let unit, format;
    switch (periodType) {
        case "Daily":
            unit = "days";
            format = "YYYYMMDD";
            break;
        case "Monthly":
            unit = "months";
            format = "YYYYMM";
            break;
        case "Yearly":
            unit = "years";
            format = "YYYY";
            break;
        case "Weekly":
            unit = "weeks";
            format = "YYYY[W]W";
            break;
        default:
            throw new Error("Unsupported periodType");
    }

    const dates = [];
    for (const current = moment(startYear + "-01-01"); current.isSameOrBefore(moment(endYear + "-12-31")); current.add(1, unit)) {
        dates.push(current.format(format));
    }

    return dates;
}

export function buildPossibleYears(startYear, endYear) {
    const dates = [];
    for (const current = moment(startYear + "-01-01"); current.isSameOrBefore(moment(endYear + "-12-31")); current.add(1, "year")) {
        dates.push({
            value: current.year(),
            label: current.year().toString()
        });
    }

    return dates;
}
