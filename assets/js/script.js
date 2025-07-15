const HOST = "localhost";
const PROTOCOL = "http";

import data_incoming from "../../data/incoming.json" with { type: "json" };
import data_active from "../../data/active_performance.json" with { type: "json" };
import data_egress from "../../data/egress.json" with { type: "json" };
import data_si_classes from "../../data/si_classes.json" with { type: "json" };
import data_other_classes from "../../data/other_classes.json" with { type: "json" };
import data_activity from "../../data/activity_comp.json" with { type: "json" };
import data_success_rate from "../../data/success_rate.json" with { type: "json" };
import data_si_approv_rates from "../../data/si_approv_rates.json" with { type: "json" };
import data_other_approv_rates from "../../data/other_classes_approv_rates.json" with { type: "json" };

/***********************************************************************************
****************************** Funções Utilitárias *********************************
************************************************************************************/
async function getData(url) {
    var result = null;
    await fetch(url)
    .then(response => {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        return response.json();
    })
    .then(data => {
        result = data;
    })
    .catch(error => {
        console.error("[DEBUG] Error:", error);
    });
    return result;
}

function createExcelFile(data, key_main_data, label_main_data, key_other_data = null, label_other_data = null, name_file = "data.xlsx") {
    const sheet = XLSX.utils.book_new();
    let mainSheet = XLSX.utils.json_to_sheet(data[key_main_data]);
    XLSX.utils.book_append_sheet(sheet, mainSheet, label_main_data);
    if (key_other_data != null && label_other_data != null) {
        let otherSheet = XLSX.utils.json_to_sheet(data[key_other_data]);
        XLSX.utils.book_append_sheet(sheet, otherSheet, label_other_data);
    }
    XLSX.writeFile(sheet, name_file);
}

function getPeriodRange(start_period = null, end_period = null) {
    let num_period = 9;
    let period = data_incoming.entry_type.period.slice(-num_period);
    let result = {start: period[0], end: period.at(-1)};
    if (start_period == null && end_period != null && "\d{4}/[1-4]".test(end_period)) {
        idx = data_incoming.entry_type.period.indexOf(end_period);
        if (idx != -1) {
            period = data_incoming.entry_type.period.slide((idx - num_period), (idx + 1));
        }
    }
    if (end_period == null && start_period != null && "\d{4}/[1-4]".test(start_period)) {
        idx = data_incoming.entry_type.period.indexOf(start_period);
        if (idx != -1) {
            period = data_incoming.entry_type.period.slide(idx, (idx + num_period + 1));
        }
    }
    result["start"] = (start_period == null) ? period[0] : start_period;
    result["end"] = (end_period == null) ? period.at(-1) : end_period;
    return result;
}

function findValidPeriod(periods, only_year = false) {
    let idx_start = periods.indexOf(only_year ? parseInt(periodRange.start.split("/")[0]) : periodRange.start);
    let idx_end = periods.indexOf(only_year ? parseInt(periodRange.end.split("/")[0]) : periodRange.end);
    if (idx_start == -1) {
        idx_start = periods.findIndex((item) => parseInt(item.split("/")[0]) >= parseInt(periodRange.start.split("/")[0]));
    }
    if (idx_end == -1) {
        idx_end = periods.findLastIndex((item) => parseInt(item.split("/")[0]) <= parseInt(periodRange.end.split("/")[0]));
    }
    let idx_period = {start: idx_start, end: idx_end};
    return idx_period;
}

function createBarChart(css_selector, records, x_label, y_label, maxY = null, is_percentage = false) {
    let id_chart = css_selector.replace("#", "");
    var chart = new ApexCharts(document.querySelector(css_selector), {
        series: [{name: y_label, data: records.y_axis}],
        chart: {id: id_chart, type: "bar", height: 350},
        plotOptions: {bar: {borderRadius: 4, horizontal: false, columnWidth: "35%"}},
        dataLabels: {enabled: false},
        theme: {palette: "palette3"},
        xaxis: {categories: records.x_axis, title: {text: x_label}},
        yaxis: {title: {text: y_label}, stepSize: 10, forceNiceScale: false, min: 0, max: maxY != null ? maxY : Math.max(...records.y_axis),
                labels: {formatter: function (val) { return is_percentage ? val.toString() + "%" : Math.ceil(val).toString(); }}}
    });
    chart.render();
    return chart;
}

function createGroupedBarChart(css_selector, records, x_label, y_label) {
    let id_chart = css_selector.replace("#", "");
    var options = {
        series: records[1],
        chart: {id: id_chart, type: "bar", height: 350, width: "100%"},
        plotOptions: {bar: {horizontal: false, columnWidth: "55%", endingShape: "rounded"}},
        dataLabels: {enabled: false},
        stroke: {show: true, width: 2, colors: ["transparent"]},
        xaxis: {categories: records[0], title: {text: x_label}},
        yaxis: {title: {text: y_label}},
        fill: {opacity: 1},
        colors: ["#33B2DF", "#546E7A", "#13D8AA", "#D4526E", "#A5978B",
                 "#C7F464", "#F9A3A4", "#3F51B5", "#662E9B", "#2E294E"],
        tooltip: {y: {title: {text: y_label}}}
    };
    var chart = new ApexCharts(document.querySelector(css_selector), options);
    chart.render();
}

function createMultipleGroupedBarChart(css_selector_main, css_selector_subchart, records, x_label_1, x_label_2, y_label, subtitle_main) {
    let id_main_chart = css_selector_main.replace("#", "");
    let id_subchart = css_selector_subchart.replace("#", "");
    let colors = ["#33B2DF", "#546E7A", "#13D8AA", "#D4526E", "#A5978B",
                  "#C7F464", "#F9A3A4", "#3F51B5", "#662E9B", "#2E294E"];
    let idx_data_point = null;
    var options_main = {
        series: records[1],
        chart: {id: id_main_chart, type: "bar", height: 350, width: "100%",
            events: {
                dataPointSelection: function (e, chart, opts) {
                    var element_subchart = document.querySelector(css_selector_subchart);
                    var element_main_chart = document.querySelector(css_selector_main);
                    if (opts.selectedDataPoints[opts.seriesIndex].length === 1) {
                        idx_data_point = opts.dataPointIndex;
                        if (element_subchart.classList.contains("active")) {
                            updateSubChartGrouped(id_subchart, records[2][idx_data_point]);
                        } else {
                            element_main_chart.classList.add("chart-activated")
                            element_subchart.classList.add("active");
                            element_subchart.classList.remove("disable");
                            updateSubChartGrouped(id_subchart, records[2][idx_data_point]);
                        }
                    }
                    if (opts.selectedDataPoints[opts.seriesIndex].length === 0) {
                        element_main_chart.classList.remove("chart-activated")
                        element_subchart.classList.remove("active");
                        element_subchart.classList.add("disable");
                    }
                },
                updated:  function (chart) {
                    updateSubChartGrouped(id_subchart, records[2][idx_data_point]);
                }
            }
        },
        plotOptions: {bar: {horizontal: false, columnWidth: "55%", endingShape: "rounded"}},
        dataLabels: {enabled: false},
        stroke: {show: true, width: 2, colors: ["transparent"]},
        xaxis: {categories: records[0], title: {text: x_label_1}},
        yaxis: {title: {text: y_label}},
        fill: {opacity: 1},
        colors: colors,
        tooltip: {y: { title: {text: y_label}}},
        states: {
            normal: {filter: {type: "desaturate"}},
            active: {allowMultipleDataPointsSelection: false, filter: {type: "darken", value: 1}}},
        subtitle: {text: subtitle_main, floating: true, offsetX: 15, offsetY: -5}
    };

    var main_chart = new ApexCharts(document.querySelector(css_selector_main), options_main);
    main_chart.render();

    var options_subchart = {
        series: [{name: null, data: []}],
        chart: {id: id_subchart, type: "bar", height: 550, width: "100%"},
        plotOptions: {bar: {horizontal: false, columnWidth: "55%", endingShape: "rounded"}},
        dataLabels: {enabled: false},
        stroke: {show: true, width: 2, colors: ["transparent"]},
        xaxis: {categories: [], title: {text: x_label_2}, labels: {rotate: -60}},
        yaxis: {title: {text: y_label}},
        fill: {opacity: 1},
        colors: colors,
        tooltip: {y: {title: {text: y_label}}}
    };

    var sub_chart = new ApexCharts(document.querySelector(css_selector_subchart), options_subchart);
    sub_chart.render();

    main_chart.addEventListener("dataPointSelection", function (e, main_chart, opts) {
        var element_subchart = document.querySelector(id_subchart);
        var element_main_chart = document.querySelector(id_main_chart);
        if (opts.selectedDataPoints[opts.seriesIndex].length === 1) {
            idx_data_point = opts.dataPointIndex;
            if(element_subchart.classList.contains("active")) {
                updateSubChartGrouped(id_subchart, records[2][idx_data_point]);
            } else {
                element_main_chart.classList.add("chart-activated");
                element_subchart.classList.add("active");
                updateSubChartGrouped(id_subchart, records[2][idx_data_point]);
            }
        }
        if (opts.selectedDataPoints[opts.seriesIndex].length === 0) {
            element_main_chart.classList.remove("chart-activated");
            element_subchart.classList.remove("active");
        }
    });

    main_chart.addEventListener("updated", function (main_chart) {
        updateSubChartGrouped(id_subchart, records[2][idx_data_point]);
    });
}

function updateSubChartGrouped(id_subchart, records) {
    let series = null;
    if (records != null) {
        let keys = Object.keys(records);
        let options = {xaxis: {categories: records[keys[0]], labels: {rotate: -60}}};
        series = records[keys[1]].map((x, idx) => Object.create({name: x, data: records.data[idx]}));

        if (series.length === 0)
            series = [{name: null, data: []}];

        ApexCharts.exec(id_subchart, "updateOptions", options, false, true);
        ApexCharts.exec(id_subchart, "updateSeries", series, true);
    }
}

function createMultipleBarChart(css_selector_main, css_selector_subchart, records, x_label_1, x_label_2, y_label, subtitle_main, maxY = null, is_percentage = false) {
    let id_main_chart = css_selector_main.replace("#", "");
    let id_subchart = css_selector_subchart.replace("#", "");
    let idx_data_point = null;
    var options_main = {
        series: [{name: y_label, data: records.y_axis}],
        chart: {id: id_main_chart, type: "bar", height: 350, width: "100%",
            events: {
                dataPointSelection: function (e, chart, opts) {
                    var element_subchart = document.querySelector(css_selector_subchart);
                    var element_main_chart = document.querySelector(css_selector_main);
                    if (element_main_chart != null && element_subchart != null && opts.selectedDataPoints[opts.seriesIndex].length === 1) {
                        idx_data_point = opts.dataPointIndex;
                        if (element_subchart.classList.contains("active")) {
                            updateBarChart(id_subchart, records.subchart[idx_data_point], y_label, maxY, is_percentage);
                        } else {
                            element_main_chart.classList.add("chart-activated");
                            element_subchart.classList.add("active");
                            element_subchart.classList.remove("disable");
                            updateBarChart(id_subchart, records.subchart[idx_data_point], y_label, maxY, is_percentage);
                        }
                    }
                    if (element_main_chart != null && opts.selectedDataPoints[opts.seriesIndex].length === 0) {
                        element_main_chart.classList.remove("chart-activated");
                        element_subchart.classList.remove("active");
                        element_subchart.classList.add("disable");
                        idx_data_point = null;
                    }
                    chart.w.config.customData = idx_data_point;
                },
                updated:  function (chart) {
                    updateBarChart(id_subchart, records.subchart[idx_data_point], y_label, maxY, is_percentage);
                    chart.w.config.customData = idx_data_point;
                }
            }
        },
        plotOptions: {bar: {borderRadius: 4, horizontal: false, columnWidth: "35%", endingShape: "rounded"}},
        dataLabels: {enabled: false},
        theme: {palette: "palette3"},
        xaxis: {categories: records.x_axis, title: {text: x_label_1}},
        yaxis: {title: {text: y_label}, stepSize: 10, forceNiceScale: false, min: 0, max: maxY != null ? maxY : Math.max(...records.y_axis),
                labels: {formatter: function (val) { return is_percentage ? val.toString() + "%" : Math.ceil(val).toString(); }}},
        states: {
            normal: {filter: {type: "desaturate"}},
            active: {allowMultipleDataPointsSelection: false, filter: {type: "darken", value: 1}}},
        subtitle: {text: subtitle_main, floating: true, offsetX: 15, offsetY: -5},
        customData: null
    };

    var main_chart = new ApexCharts(document.querySelector(css_selector_main), options_main);
    main_chart.render();

    var options_subchart = {
        series: [{name: y_label, data: []}],
        chart: {id: id_subchart, type: "bar", height: 350, width: "100%"},
        plotOptions: {bar: {borderRadius: 4, horizontal: false, columnWidth: "35%", endingShape: "rounded"}},
        dataLabels: {enabled: false},
        theme: {palette: "palette3"},
        xaxis: {categories: [], title: {text: x_label_2}, labels: {rotate: -60}},
        yaxis: {title: {text: y_label}}
    };

    var sub_chart = new ApexCharts(document.querySelector(css_selector_subchart), options_subchart);
    sub_chart.render();

    main_chart.addEventListener("dataPointSelection", function (e, main_chart, opts) {
        var element_subchart = document.querySelector(id_subchart);
        var element_main_chart = document.querySelector(id_main_chart);
        if (element_main_chart != null && element_subchart != null && opts.selectedDataPoints[opts.seriesIndex].length === 1) {
            idx_data_point = opts.dataPointIndex;
            if (element_subchart.classList.contains("active")) {
                updateBarChart(id_subchart, records.subchart[idx_data_point], y_label, maxY, is_percentage);
            } else {
                element_main_chart.classList.add("chart-activated");
                element_subchart.classList.add("active");
                updateBarChart(id_subchart, records.subchart[idx_data_point], y_label, maxY, is_percentage);
            }
        }
        if (element_main_chart != null && opts.selectedDataPoints[opts.seriesIndex].length === 0) {
            element_main_chart.classList.remove("chart-activated");
            element_subchart.classList.remove("active");
            idx_data_point = null;
        }
    });

    main_chart.addEventListener("updated", function (main_chart) {
        updateBarChart(id_subchart, records.subchart[idx_data_point], y_label, maxY, is_percentage);
    });
}

async function downloadRawData(data_label) {
    let result = await getData(end_points[data_label]);
    createExcelFile(result, "raw_data", "Produção");
}

function updateBarChart(id_chart, records, y_label = null, maxY = null, is_percentage = false) {
    if (records != null) {
        let options = {
            xaxis: {categories: records.x_axis},
            yaxis: {title: {text: (y_label != null) ? y_label : ""}, stepSize: 10, forceNiceScale: false,
                    min: 0, max: maxY != null ? maxY : Math.max(...records.y_axis),
                    labels: {formatter: function (val) { return is_percentage ? val.toString() + "%" : Math.ceil(val).toString(); }}
            }
        };
        ApexCharts.exec(id_chart, "updateOptions", options);
        ApexCharts.exec(id_chart, "updateSeries", [{data: records.y_axis}], true);
    }
}

function updateGroupBarChart(id_chart, records) {
    let options = {xaxis: {categories: records[0]}};
    ApexCharts.exec(id_chart, "updateOptions", options, false, true);
    ApexCharts.exec(id_chart, "updateSeries", records[1], true);
}

/***********************************************************************************
************************************* Análises *************************************
************************************************************************************/
function getSuccessRateByPeriod(to_update = false) {
    const only_active = document.getElementById("btOnlyActive5").checked;
    let data = only_active ? data_success_rate.data_only_active : data_success_rate.data;
    let idx_year = findValidPeriod(data.year, true);
    let result = Object.create({x_axis: data.year.slice(idx_year.start, idx_year.end + 1),
        y_axis: data.success_rate.slice(idx_year.start, idx_year.end + 1)});
    if (!to_update) {
        document.getElementById("title_success_rate_period").innerHTML = "Taxa de Sucesso por Período";
        createBarChart("#success_rate_by_period", result, "Período", "Percentual", 100, true);
    } else {
        updateBarChart("success_rate_by_period", result, "Percentual", 100, true);
    }
}

function getApprovRatesByPeriodDiscipline(title_id, id_chart, id_subchart, only_si = true, to_update = false) {
    const is_net_rate = document.getElementById("btOnlyActive6").checked;
    let idx_data = is_net_rate ? 1 : 0;
    let data_chart = only_si ? data_si_approv_rates : data_other_approv_rates;
    let idx_period = findValidPeriod(data_chart.period);
    let result = Object.create({x_axis: data_chart.period.slice(idx_period.start, idx_period.end + 1),
        y_axis: data_chart.data[idx_data].slice(idx_period.start, idx_period.end + 1),
        subchart: data_chart.subchart.slice(idx_period.start, idx_period.end + 1)});
    result.subchart = result.subchart.map((x) => Object.create(
        {x_axis: x.curr_component, y_axis: x.data[idx_data]}));
    document.getElementById(title_id).innerHTML = `Taxa de Aprovação ${is_net_rate ? "Líquida " : ""}por Período e Disciplina <span> (${only_si ? "DSI" : "Outros"}) </span>`;
    if (!to_update) {
        createMultipleBarChart(id_chart, id_subchart, result, "Período", "Disciplina",
            "Percentual", "(Clique na barra de um período para ver detalhes)", 100, true);
    } else {
        updateBarChart(id_chart.replace("#", ""), result, "Percentual", 100, true);
        let idx_data_point = ApexCharts.getChartByID(id_chart.replace("#", "")).w.config.customData;
        id_subchart = id_subchart.replace("#", "");
        if (idx_data_point != null && document.getElementById(id_subchart).classList.contains("active")) {
            updateBarChart(id_subchart, result.subchart[idx_data_point], "Percentual", 100, true);
        }
    }
}

function getIncomingByPeriod(to_update = false) {
    const only_active = document.getElementById("btOnlyActive1").checked;
    let data = only_active ? data_incoming.entry_type_only_active : data_incoming.entry_type;
    let idx_period = findValidPeriod(data.period);
    let result = Object.create({x_axis: data.period.slice(idx_period.start, idx_period.end + 1),
        y_axis: data.total.slice(idx_period.start, idx_period.end + 1)});
    if (!to_update) {
        document.getElementById("title_incoming_period").innerHTML = "Ingressantes por Período";
        createBarChart("#incoming_by_period", result, "Período", "Nº. de Discentes");
    } else {
        updateBarChart("incoming_by_period", result, "Nº. de Discentes");
    }
}

function getIncomingByPeriodType(to_update = false) {
    const only_active = document.getElementById("btOnlyActive2").checked;
    let data = [only_active ? data_incoming.entry_type_only_active.entry_type : data_incoming.entry_type.entry_type];
    data[1] = only_active ? data_incoming.entry_type_only_active.data : data_incoming.entry_type.data;
    let period = only_active ? data_incoming.entry_type_only_active.period : data_incoming.entry_type.period;
    let idx_period = findValidPeriod(period);
    let result = [period.slice(idx_period.start, idx_period.end + 1)];
    result[1] = data[0].map((x, idx) => Object.create({name: x, data: data[1][idx].slice(idx_period.start, idx_period.end + 1)}));
    if (!to_update) {
        document.getElementById("title_incoming_period_type").innerHTML = "Ingressantes por Período e Tipo de Entrada";
        createGroupedBarChart("#incoming_by_period_type", result, "Período", "Nº. de Discentes");
    } else {
        updateGroupBarChart("incoming_by_period_type", result);
    }
}

function getIncomingByPeriodStatus(to_update = false) {
    let idx_period = findValidPeriod(data_incoming.status.period);
    let result = [data_incoming.status.period.slice(idx_period.start, idx_period.end + 1)];
    result[1] = data_incoming.status.status.map((x, idx) => Object.create({name: x,
        data: data_incoming.status.data[idx].slice(idx_period.start, idx_period.end + 1)}));
    if (!to_update) {
        document.getElementById("title_incoming_period_status").innerHTML = "Ingressantes por Período e Situação";
        createGroupedBarChart("#incoming_by_period_status", result, "Período", "Nº. de Discentes");
    } else {
        updateGroupBarChart("incoming_by_period_status", result);
    }
}

function getActiveByPeriod(to_update = false) {
    const only_active = document.getElementById("btOnlyActive3").checked;
    let data = only_active ? data_active.only_active : data_active.all_data;
    let idx_period = findValidPeriod(data.period);
    let result = Object.create({
        x_axis: data.period.slice(idx_period.start, idx_period.end + 1),
        y_axis: data.total.slice(idx_period.start, idx_period.end + 1)});
    if (!to_update) {
        document.getElementById("title_active_period").innerHTML = "Ativos por Período";
        createBarChart("#active_by_period", result, "Período", "Nº. de Discentes");
    } else {
        updateBarChart("active_by_period", result);
    }
}

function getPerformanceByPeriodStatus(to_update = false) {
    const only_active = document.getElementById("btOnlyActive4").checked;
    let data = [only_active ? data_active.only_active.status: data_active.all_data.status];
    data[1] = only_active ? data_active.only_active.data: data_active.all_data.data;
    let period = only_active ? data_active.only_active.period: data_active.all_data.period;
    let idx_period = findValidPeriod(period);
    let result = [period.slice(idx_period.start, idx_period.end + 1)];
    result[1] = data[0].map((x, idx) => Object.create({name: x,
        data: data[1][idx].slice(idx_period.start, idx_period.end + 1)}));
    if (!to_update) {
        document.getElementById("title_performance_period_entry").innerHTML = "Rendimento por Entrada e Período";
        createGroupedBarChart("#performance_by_period_entry", result, "Período", "Nº. de Discentes");
    } else {
        updateGroupBarChart("performance_by_period_entry", result);
    }
}

function getEgressByPeriod(to_update = false) {
    let idx_period = findValidPeriod(data_egress.period);
    let result = Object.create({
        x_axis: data_egress.period.slice(idx_period.start, idx_period.end + 1),
        y_axis: data_egress.total.slice(idx_period.start, idx_period.end + 1)});
    if (!to_update) {
        document.getElementById("title_egress_period").innerHTML = "Egressos por Período";
        createBarChart("#egress_by_period", result, "Período", "Nº. de Discentes");
    } else {
        updateBarChart("egress_by_period", result);
    }
}

function getEgressByPeriodType(to_update = false) {
    let idx_period = findValidPeriod(data_egress.period);
    let result = [data_egress.period.slice(idx_period.start, idx_period.end + 1)];
    result[1] = data_egress.entry_type.map((x, idx) => Object.create({name: x,
        data: data_egress.data_entry_type[idx].slice(idx_period.start, idx_period.end + 1)}));
    if (!to_update) {
        document.getElementById("title_egress_period_type").innerHTML = "Egressos por Período e Tipo de Entrada";
        createGroupedBarChart("#egress_by_period_type", result, "Período", "Nº. de Discentes");
    } else {
        updateGroupBarChart("egress_by_period_type", result);
    }
}

function getDisciplineByPeriodStatus(title_id, id_chart, id_subchart, only_si = true, to_update = false) {
    let data_chart = only_si ? data_si_classes : data_other_classes;
    let idx_period = findValidPeriod(data_chart.period);
    let result = [data_chart.period.slice(idx_period.start, idx_period.end + 1)];
    result[1] = data_chart.status.map((x, idx) => Object.create({name: x,
        data: data_chart.data[idx].slice(idx_period.start, idx_period.end + 1)}));
    result[2] = data_chart.subchart.slice(idx_period.start, idx_period.end + 1);
    if (!to_update) {
        document.getElementById(title_id).innerHTML = `Disciplinas por Período e Situação <span> (${only_si ? "DSI" : "Outros"}) </span>`;
        createMultipleGroupedBarChart(id_chart, id_subchart, result, "Período", "Disciplina",
            "Nº. de Discentes", "(Clique em qualquer barra de um período para ver detalhes)");
    } else {
        updateGroupBarChart(id_chart.replace("#", ""), result);
    }
}

function getActivityByPeriodStatus(to_update = false) {
    let idx_period = findValidPeriod(data_activity.period);
    let result = [data_activity.period.slice(idx_period.start, idx_period.end + 1)];
    result[1] = data_activity.status.map((x, idx) => Object.create({name: x,
        data: data_activity.data[idx].slice(idx_period.start, idx_period.end + 1)}));
    result[2] = data_activity.subchart.slice(idx_period.start, idx_period.end + 1);
    if (!to_update) {
        document.getElementById("title_activity_period_status").innerHTML = "Atividades por Período e Situação";
        createMultipleGroupedBarChart("#activity_result_period", "#activity_result_status_period",
            result, "Período", "Atividade", "Nº. de Discentes", "(Clique em qualquer barra de um período para ver detalhes)");
    } else {
        updateGroupBarChart("activity_result_period", result);
    }
}

function initDashboard(start_year = null, end_year = null, to_update = false) {
    periodRange = (start_year == null && end_year == null) ?
        getPeriodRange() : getPeriodRange(start_year, end_year);
    document.getElementById("start_year").value = periodRange.start;
    document.getElementById("end_year").value = periodRange.end;
    getSuccessRateByPeriod(to_update);
    getApprovRatesByPeriodDiscipline("title_si_approv_rates",
        "#si_approv_rate_period", "#si_approv_rate_classes", true, to_update);
    getIncomingByPeriod(to_update);
    getIncomingByPeriodType(to_update);
    getIncomingByPeriodStatus(to_update);
    getActiveByPeriod(to_update);
    getEgressByPeriod(to_update);
    getEgressByPeriodType(to_update);
    getPerformanceByPeriodStatus(to_update);
    getDisciplineByPeriodStatus("title_discipline_period_status", "#discipline_result_period", "#discipline_result_status_period", true, to_update);
    getDisciplineByPeriodStatus("title_other_class_period_status", "#other_class_result_period", "#other_class_result_type_period", false, to_update);
    getActivityByPeriodStatus(to_update);
}

var periodRange = null;

initDashboard();

document.getElementById("btOnlyActive1").addEventListener("change", () => {
    let start_year = document.getElementById("start_year").value;
    let end_year = document.getElementById("end_year").value;
    periodRange = (start_year == null && end_year == null) ?
        getPeriodRange() : getPeriodRange(start_year, end_year);
    getIncomingByPeriod(true);
});

document.getElementById("btOnlyActive2").addEventListener("change", () => {
    let start_year = document.getElementById("start_year").value;
    let end_year = document.getElementById("end_year").value;
    periodRange = (start_year == null && end_year == null) ?
        getPeriodRange() : getPeriodRange(start_year, end_year);
    getIncomingByPeriodType(true);
});

document.getElementById("btOnlyActive3").addEventListener("change", () => {
    let start_year = document.getElementById("start_year").value;
    let end_year = document.getElementById("end_year").value;
    periodRange = (start_year == null && end_year == null) ?
        getPeriodRange() : getPeriodRange(start_year, end_year);
    getActiveByPeriod(true);
});

document.getElementById("btOnlyActive4").addEventListener("change", () => {
    let start_year = document.getElementById("start_year").value;
    let end_year = document.getElementById("end_year").value;
    periodRange = (start_year == null && end_year == null) ?
        getPeriodRange() : getPeriodRange(start_year, end_year);
    getPerformanceByPeriodStatus(true);
});

document.getElementById("btOnlyActive5").addEventListener("change", () => {
    let start_year = document.getElementById("start_year").value;
    let end_year = document.getElementById("end_year").value;
    periodRange = (start_year == null && end_year == null) ?
        getPeriodRange() : getPeriodRange(start_year, end_year);
    getSuccessRateByPeriod(true);
});

document.getElementById("btOnlyActive6").addEventListener("change", () => {
    let start_year = document.getElementById("start_year").value;
    let end_year = document.getElementById("end_year").value;
    periodRange = (start_year == null && end_year == null) ?
        getPeriodRange() : getPeriodRange(start_year, end_year);
    getApprovRatesByPeriodDiscipline("title_si_approv_rates",
        "#si_approv_rate_period", "#si_approv_rate_classes", true, true);
});

document.getElementById("bt_update").addEventListener("click", () => {
    periodRange = null;
    var start_year = document.getElementById("start_year").value;
    var end_year = document.getElementById("end_year").value;
    initDashboard(start_year, end_year, true);
});