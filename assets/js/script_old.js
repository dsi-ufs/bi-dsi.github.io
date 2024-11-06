const HOST = "localhost"
const PROTOCOL = "http"
// const HOST = "ppgeec.dca.ufrn.br"
// const PROTOCOL = "https"

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

function createTable(element, records) {
    let dataTable = new simpleDatatables.DataTable(element, {
        perPageSelect: [5, 10, 20, ["Todos", -1]],
        labels: {
            placeholder: "Pesquisar...",
            searchTitle: "Pesquise dentro da tabela",
            pageTitle: "Página {page}",
            perPage: "registros por página",
            noRows: "Sem registros",
            info: "{start}-{end} de {rows} registros",
            noResults: "Nenhum resultado corresponde à busca",
        },
        data: {
            headings: Object.keys(records[0]),
            data: records.map(item => Object.values(item))
        }
    });
    return dataTable;
}

function getYearRange(start_year = null, end_year = null) {
    if(start_year == null && end_year == null) {
        end_year = new Date().getFullYear();
        start_year = end_year - 4;
    }
    if(start_year == null && end_year != null && typeof end_year == "number")
        start_year = end_year - 4;
    if(end_year == null && start_year != null && typeof start_year == "number")
        end_year = start_year + 4;
    return {start: start_year, end: end_year}
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
        series: records[1].map((x) => Object.create({name: x[0], data: x[1]})),
        chart: {id: id_chart, type: "bar", height: 350},
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
    return chart;
}

function createBoxPlot(css_selector, ppg_acronym, records, has_outliers = false) {
    let id_chart = css_selector.replace("#", "");
    var options = {
        series: [
            {name: "box", type: "boxPlot", data: [{x: ppg_acronym,
                y: [records.min, records.quantile_1, records.median, records.quantile_3, records.max]}]}],
        chart: {id: id_chart, type: "boxPlot", height: 350, toolbar: {
            show: true, tools: {download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false}
        }},
        colors: ["#33B2DF", "#FEB019"],
        xaxis: {type: "string"},
        tooltip: {shared: false, intersect: true},
        plotOptions: {boxPlot: {colors: {upper: "#33B2DF", lower: "#546E7A"}}}
    };
    if (!has_outliers) {
        options.series.splice(1, 1);
        options.colors.splice(1, 1);
    }
    var chart = new ApexCharts(document.querySelector(css_selector), options);
    chart.render();
    return chart;
}

function createTreeMapPlot(css_selector, records) {
    let id_chart = css_selector.replace("#", "");
    let colors = ["#33B2DF", "#546E7A", "#13D8AA", "#D4526E", "#A5978B",
                  "#557808", "#F9A3A4", "#2B387C", "#662E9B", "#4E2E29",
                  "#FF5733", "#96BF9D", "#3357FF", "#FF33A1", "#FFBD33",
                  "#75FF33", "#33FFBD", "#FF3333", "#8A33FF", "#33FF8A"];
        // ['#3B93A5', '#F7B844', '#ADD8C7', '#EC3C65', '#CDD7B6',
        //     '#C1F666', '#D43F97', '#1E5D8C', '#421243', '#7F94B0',
        //     '#EF6537', '#C0ADDB'];
    var chart = new ApexCharts(document.querySelector(css_selector), {
        series: [{data: records}], legend: {show: false},
        chart: {id: id_chart, type: "treemap", height: 350},
        colors: colors,
        plotOptions: {treemap: {distributed: true, enableShades: false}}
    });
    chart.render();
}

function createNetPlot(records, id_network, style_net) {
    let cy = cytoscape({
        container: document.getElementById(id_network),
        wheelSensitivity: 0.5,
        textureOnViewport: true,
        layout: {
            name: "cose",
            idealEdgeLength: 100,
            nodeOverlap: 20,
            refresh: 20,
            fit: true,
            padding: 30,
            randomize: false,
            componentSpacing: 100,
            nodeRepulsion: 400000,
            edgeElasticity: 100,
            nestingFactor: 5,
            gravity: 80,
            numIter: 1000,
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 1.0
        },
        style: style_net,
        elements: records
    });
    window[id_network] = cy;
    return cy;
}

async function downloadRawData(data_label) {
    let result = await getData(end_points[data_label]);
    createExcelFile(result, "raw_data", "Produção");
}

function updateBarChart(id_chart, records) {
    let options = {
        xaxis: {categories: records.x_axis},
        yaxis: {min: 0, max: maxY != null ? maxY : Math.max(...records.y_axis)}
    };
    ApexCharts.exec(id_chart, "updateOptions", options, false, true);
    ApexCharts.exec(id_chart, "updateSeries", [{data: result.y_axis}], true);
}

async function updateGroupBarChart(apiUrl, id_chart) {
    let records = await getData(apiUrl);
    let options = {
        xaxis: {categories: records[0]}
    };
    ApexCharts.exec(id_chart, "updateOptions", options, false, true);
    ApexCharts.exec(id_chart, "updateSeries",
        records[1].map((x) => Object.create({name: x[0], data: x[1]})), true);
}

function updateBoxPlot(id_chart, records) {
    ApexCharts.exec(id_chart, "updateSeries",
        [{data: [{x: ppg_acronym, y: [records.min, records.quantile_1, records.median,
            records.quantile_3, records.max]}]}], true);
}

function updateTreeMapChart(id_chart, records) {
    ApexCharts.exec(id_chart, "updateSeries", [{data: records}], true);
}
/***********************************************************************************
**************************** Simulação de Credenciamento ***************************
************************************************************************************/
function initSimulation() {
    document.getElementById("form_accred_score").addEventListener("submit",
        async function(event) {
            const action = `${PROTOCOL}://${HOST}:8000/accreditation/calc-score/`;
            const div_loading = document.getElementById("div_loading");
            const body = document.body;
            div_loading.style.display = "inline";
            body.classList.add("opacity");
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);

            let result = null;
            await fetch(action, {method: form.method, body: formData})
            .then(response => {
                if (!response.ok) {
                    div_loading.style.display = "none";
                    body.classList.remove("opacity");
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then(data => {
                dataSimulation = data;
            })
            .catch(error => {
                div_loading.style.display = "none";
                body.classList.remove("opacity");
                console.error("[DEBUG] Error:", error);
            });
            if (dataSimulation != null) {
                div_loading.style.display = "none";
                body.classList.remove("opacity");
                document.getElementById("div_score").removeAttribute("hidden");
                document.getElementById("accreditation_score").innerHTML = "Sua pontuação é: " + dataSimulation.pqt;
                console.log(dataSimulation);
            }
        }
    );

    document.getElementById("bt_download").addEventListener("click", function() {
        if (dataSimulation != null) {
            createExcelFile(dataSimulation, "production_researcher", "Produção", "stats_researcher", "Pontuação");
        }
    });
}
/***********************************************************************************
************************************* Rankings *************************************
************************************************************************************/
async function getTopJournals(n_records) {
    const apiUrl = `${PROTOCOL}://${HOST}:8000/rankings/top-journals/?n_records=${n_records}`;
    var result = await getData(apiUrl);
    return createTable("#table_top_journals", result);
}

async function getTopCitedManuscripts(n_records) {
    const apiUrl = `${PROTOCOL}://${HOST}:8000/rankings/top-cited-manuscripts/?n_records=${n_records}`;
    var result = await getData(apiUrl);
    return createTable("#table_top_cited_articles", result);
}

/***********************************************************************************
************************************* Análises *************************************
************************************************************************************/
async function getProductionByYear(apiUrl) {
    document.getElementById("title_production_year").innerHTML = "Produção por Ano <span>(Conferência e Periódico)</span>";
    let result = await getData(apiUrl);
    createBarChart("#production_by_year", result, "Ano", "Número de Manuscritos");
}

async function getProductionByTypeYear(apiUrl) {
    document.getElementById("title_production_type_year").innerHTML = "Produção por Ano e Tipo";
    let result = await getData(apiUrl);
    createGroupedBarChart("#production_by_type_year", result, "Ano", "Número de Manuscritos");
}

async function getInterPercentByYear(apiUrl) {
    document.getElementById("title_inter_percent_year").innerHTML = "Internacionalização por Ano <span>(Percentual)</span>";
    document.getElementById("title_total_inter_percent").innerHTML = "Internacionalização <span>(Total)</span>";
    let result = await getData(apiUrl);
    document.getElementById("total_inter_percent").innerHTML = result.total_inter_percent;
    createBarChart("#inter_percent_by_year", result.percentages, "Ano", "Percentual", 100, true);
}

async function getOpenAccessPercentByYear(apiUrl) {
    let is_open_access = document.getElementById("btOpenAccess").checked;
    document.getElementById("title_open_access_year").innerHTML = "Artigos " +
        (is_open_access ? "Open" : "Closed") + "-Access por Ano <span>(Percentual)</span>";
    let result = await getData(apiUrl);
    createBarChart("#open_access_by_year", result, "Ano", "Percentual", 100, true);
}

async function getJournalProductionByQualityIndicatorYear(apiUrl, id_title, title, id_chart, quality_indicator = "stratum", metric = "num_paper", label_metric = "Número de Manuscritos") {
    document.getElementById(id_title).innerHTML = title;
    let result = await getData(`${apiUrl}&quality_indicator=${quality_indicator}&metric=${metric}`);
    createGroupedBarChart(id_chart, result, "Ano", label_metric);
}

async function getTotalCitationByOATypeYear(apiUrl) {
    document.getElementById("title_citation_oa_year").innerHTML = "Total de Citações por Ano e Tipo de Open-Access";
    let result = await getData(apiUrl);
    createGroupedBarChart("#citation_oa_year", result, "Ano", "Total de Citações");
}

async function getInterPercentPPG(apiUrl, ppg_acronym) {
    let result = await getData(apiUrl);
    document.getElementById("title_inter_percent_ppg").innerHTML = "Internacionalização <span>(Gini: " +
        result.gini_ppg + ")</span>";
    createBoxPlot("#inter_percent_ppg_chart", ppg_acronym, result);
}

async function getIndicesH(apiUrl, ppg_acronym) {
    let result = await getData(apiUrl);
    document.getElementById("title_h_index_ppg").innerHTML = "Índices h <span>(Gini: " + result.gini_ppg + ")</span>";
    document.getElementById("title_h2_index").innerHTML = "h2-index";
    document.getElementById("h2_index_ppg").innerHTML = result.h2_index;
    limit_h_index = [result.min, result.max];
    createBoxPlot("#h_index_chart", ppg_acronym, result);
}

async function getProdutivityScorePPG(apiUrl, ppg_acronym) {
    let result = await getData(apiUrl);
    document.getElementById("title_produtivity_ppg").innerHTML = "Produtividade <span>(Gini: " +
        result.gini_ppg + ")</span>";
    document.getElementById("title_produtivity_mean").innerHTML = "Produtividade <span>(Média)</span>";
    document.getElementById("produtivity_mean_ppg").innerHTML = result.mean.toString().replace(".", ",");
    createBoxPlot("#produtivity_ppg_chart", ppg_acronym, result);
}

async function getStudentCountByLevelStatusYear(apiUrl, id_title, title, id_chart, label_metric = "Número de Discentes") {
    document.getElementById(id_title).innerHTML = title;
    let result = await getData(apiUrl);
    createGroupedBarChart(id_chart, result, "Ano", label_metric);
}

async function getTotalStudentsInPeriod(apiUrl, to_update = false) {
    if (!to_update) {
        let titles_card = [
            {"id_title": "title_concluded_student", "title": "Concluídos no Período"},
            {"id_title": "title_cancelled_student", "title": "Cancelados no Período"},
            {"id_title": "title_activated_student", "title": "Ativos no Período"}
        ];
        titles_card.map((x) => document.getElementById(x.id_title).innerHTML = x.title);
    }
    let values_card = [
        {"id_value": "msc_concluded_student", "level": "Mestrado", "status": "Concluído"},
        {"id_value": "phd_concluded_student", "level": "Doutorado", "status": "Concluído"},
        {"id_value": "msc_cancelled_student", "level": "Mestrado", "status": "Cancelado"},
        {"id_value": "phd_cancelled_student", "level": "Doutorado", "status": "Cancelado"},
        {"id_value": "msc_activated_student", "level": "Mestrado", "status": "Ativo"},
        {"id_value": "phd_activated_student", "level": "Doutorado", "status": "Ativo"},
    ];
    let result = await getData(apiUrl);
    values_card.map((x) => document.getElementById(x.id_value).innerHTML = `${x.level}: ${result[x.level][x.status]} de ${result[x.level]["Ingresso"]}`);
}

async function getSDGThesisInPeriod(apiUrl, to_update = false) {
    let result = await getData(apiUrl);
    if(!to_update) {
        document.getElementById("title_sdg_monograph").innerHTML = "Objetivos de Desenvolvimento Sustentável <span>(Dissertações e Teses)</span>";
        createTreeMapPlot("#sgd_monograph", result);
    } else {
        updateTreeMapChart("sgd_monograph", result);
    }
}

function getProgramEndPoints(start_year = null, end_year = null) {
    let yearRange = (document.getElementById("start_year").value == null && document.getElementById("end_year").value == null) ?
        getYearRange() : getYearRange(start_year, end_year);
    document.getElementById("start_year").value = yearRange.start;
    document.getElementById("end_year").value = yearRange.end;
    let is_open_access = document.getElementById("btOpenAccess").checked;
    let only_permanent = document.getElementById("ckOnlyPermanent").checked;
    let end_points = {
        "production_by_year": `${PROTOCOL}://${HOST}:8000/analysis/production-by-year/?start_year=${yearRange.start}&end_year=${yearRange.end}`,
        "production_by_type_year": `${PROTOCOL}://${HOST}:8000/analysis/production-by-type-year/?start_year=${yearRange.start}&end_year=${yearRange.end}`,
        "inter_percent_by_year": `${PROTOCOL}://${HOST}:8000/analysis/inter_percent-by-year/?start_year=${yearRange.start}&end_year=${yearRange.end}`,
        "oa_percent_by_year": `${PROTOCOL}://${HOST}:8000/analysis/oa-percent-by-year/?start_year=${yearRange.start}&end_year=${yearRange.end}&is_open_access=${is_open_access.toString()}`,
        "journals_by_year_indicator": `${PROTOCOL}://${HOST}:8000/analysis/journals-by-year-indicator/?start_year=${yearRange.start}&end_year=${yearRange.end}`,
        "total_citation_by_oa_type_year": `${PROTOCOL}://${HOST}:8000/analysis/total-citation-by-type-oa-year/?start_year=${yearRange.start}&end_year=${yearRange.end}`,
        "inter_percent_ppg": `${PROTOCOL}://${HOST}:8000/analysis/inter-percent-ppg/?start_year=${yearRange.start}&end_year=${yearRange.end}`,
        "h_indexes_ppg": `${PROTOCOL}://${HOST}:8000/analysis/h-indexes-ppg/?only_permanent=${only_permanent.toString()}`,
        "produtivity_ppg": `${PROTOCOL}://${HOST}:8000/analysis/produtivity-score-ppg/?only_permanent=${only_permanent.toString()}`,
        // "ppg_network": `${PROTOCOL}://${HOST}:8000/analysis/ppg-net/`,
        "production_data": `${PROTOCOL}://${HOST}:8000/download/raw-data/?start_year=${yearRange.start}&end_year=${yearRange.end}&filter_production=true`,
        "all_data": `${PROTOCOL}://${HOST}:8000/download/raw-data/?start_year=${yearRange.start}&end_year=${yearRange.end}`,
        "only_journal": `${PROTOCOL}://${HOST}:8000/download/raw-data/?start_year=${yearRange.start}&end_year=${yearRange.end}&only_journal=true`,
    };
    return end_points;
}

function getStudentsEndPoints(start_year, end_year) {
    let yearRange = (document.getElementById("student_start_year").value == null && document.getElementById("student_end_year").value == null) ?
        getYearRange() : getYearRange(start_year, end_year);
    document.getElementById("student_start_year").value = yearRange.start;
    document.getElementById("student_end_year").value = yearRange.end;
    let end_points = {
        "msc_students_by_status_year": `${PROTOCOL}://${HOST}:8000/analysis/students-by-status-year/?start_year=${yearRange.start}&end_year=${yearRange.end}&level=MESTRADO`,
        "phd_students_by_status_year": `${PROTOCOL}://${HOST}:8000/analysis/students-by-status-year/?start_year=${yearRange.start}&end_year=${yearRange.end}&level=DOUTORADO`,
        "total_students_in_period": `${PROTOCOL}://${HOST}:8000/analysis/total-students-in-period/?start_year=${yearRange.start}&end_year=${yearRange.end}`,
        "msc_data": `${PROTOCOL}://${HOST}:8000/download/students-raw-data/?start_year=${yearRange.start}&end_year=${yearRange.end}&level=MESTRADO`,
        "phd_data": `${PROTOCOL}://${HOST}:8000/download/students-raw-data/?start_year=${yearRange.start}&end_year=${yearRange.end}&level=DOUTORADO`
    };
    return end_points;
}

function getMonographEndPoints(start_year, end_year) {
    let yearRange = (document.getElementById("monograph_start_year").value == null && document.getElementById("monograph_end_year").value == null) ?
        getYearRange() : getYearRange(start_year, end_year);
    document.getElementById("monograph_start_year").value = yearRange.start;
    document.getElementById("monograph_end_year").value = yearRange.end;
    let end_points = {
        "sdg_monographs_in_period": `${PROTOCOL}://${HOST}:8000/analysis/sdg-monographs-in-period/?start_year=${yearRange.start}&end_year=${yearRange.end}`,
        "all_data": `${PROTOCOL}://${HOST}:8000/download/monographs-raw-data/?start_year=${yearRange.start}&end_year=${yearRange.end}`
    };
    return end_points;
}

function initProgramDashboard(end_points, to_update = false) {
    if (!to_update) {
        getProductionByYear(end_points["production_by_year"]);
        getProductionByTypeYear(end_points["production_by_type_year"]);
        getInterPercentByYear(end_points["inter_percent_by_year"]);
        getOpenAccessPercentByYear(end_points["oa_percent_by_year"]);
        getJournalProductionByQualityIndicatorYear(end_points["journals_by_year_indicator"],
            "title_journal_quality_indicator_year", "Produção de Periódicos por Ano e Qualis",
            "#journal_quality_indicator_year");
        getJournalProductionByQualityIndicatorYear(end_points["journals_by_year_indicator"],
            "title_citation_journal_quality_indicator_year", "Total de Citações em Periódicos por Ano e Qualis",
            "#citation_journal_quality_indicator_year", "stratum", "citation_num", "Total de Citações");
        getJournalProductionByQualityIndicatorYear(end_points["journals_by_year_indicator"],
            "title_journal_label_jif_year", "Produção de Periódicos por Ano e Quartil do Fator de Impacto",
            "#journal_label_jif_year", "label_jif");
        getJournalProductionByQualityIndicatorYear(end_points["journals_by_year_indicator"],
            "title_citation_journal_label_jif_year", "Total de Citações em Periódicos por Ano e Quartil do Fator de Impacto",
            "#citation_journal_label_jif_year", "label_jif", "citation_num", "Total de Citações");
        getTotalCitationByOATypeYear(end_points["total_citation_by_oa_type_year"]);
        getInterPercentPPG(end_points["inter_percent_ppg"], ppg_acronym);
        getIndicesH(end_points["h_indexes_ppg"], ppg_acronym);
        getProdutivityScorePPG(end_points["produtivity_ppg"], ppg_acronym);
    }
}

function initRankings() {
    let tables = Object();
    tables["top_journals"] = getTopJournals(50);
    tables["top_cited_manuscripts"] = getTopCitedManuscripts(30);
    return tables;
}

function initStudentDashboard(end_points, to_update = false) {
    if (!to_update) {
        getTotalStudentsInPeriod(end_points["total_students_in_period"]);
        getStudentCountByLevelStatusYear(end_points["msc_students_by_status_year"], "title_msc_students_by_status_year",
            "Alunos de Mestrado por Ano e Status", "#msc_students_by_status_year");
        getStudentCountByLevelStatusYear(end_points["phd_students_by_status_year"], "title_phd_students_by_status_year",
            "Alunos de Doutorado por Ano e Status", "#phd_students_by_status_year");
    } else {
        getTotalStudentsInPeriod(end_points["total_students_in_period"], to_update);
        updateGroupBarChart(end_points["msc_students_by_status_year"], "msc_students_by_status_year");
        updateGroupBarChart(end_points["phd_students_by_status_year"], "phd_students_by_status_year");
    }
}

function initMonographDashboard(end_points, to_update = false) {
    getSDGThesisInPeriod(end_points["sdg_monographs_in_period"], to_update);
}

var dataSimulation = null;
const ppg_acronym = "PPgEEC/UFRN";
var end_points = null;
var dataTables = null;
var netsPPG = null;

if (document.body.id == "simulation") {
    initSimulation();
} else {
    var limit_h_index = null;
    end_points = getProgramEndPoints();
    initProgramDashboard(end_points);
}

document.getElementById("btOpenAccess").addEventListener("change", async () => {
    let start_year = document.getElementById("start_year").value;
    let end_year = document.getElementById("end_year").value;
    const yearRange = (start_year == null && end_year == null) ?
        getYearRange() : getYearRange(start_year, end_year);
    const is_open_access = document.getElementById("btOpenAccess").checked;
    document.getElementById("title_open_access_year").innerHTML = "Artigos " +
        (is_open_access ? "Open" : "Closed") + "-Access por Ano <span>(Percentual)</span>";
    const apiUrl = `${PROTOCOL}://${HOST}:8000/analysis/oa-percent-by-year/?start_year=${yearRange.start}&end_year=${yearRange.end}&is_open_access=${is_open_access.toString()}`;
    var result = await getData(apiUrl);
    ApexCharts.exec("open_access_by_year", "updateSeries", [{
        data: result.y_axis}], true);
});

document.getElementById("program-tab").addEventListener("click", function() {
    end_points = getProgramEndPoints();
});

document.getElementById("ranking-tab").addEventListener("click", function() {
    if (dataTables == null) {
        dataTables = initRankings();
    }
});

document.getElementById("students-tab").addEventListener("click", function() {
    end_points = getStudentsEndPoints();
    initStudentDashboard(end_points);
});

document.getElementById("bt_student_update").addEventListener("click", () => {
    let start_year = document.getElementById("student_start_year").value;
    let end_year = document.getElementById("student_end_year").value;
    end_points = getStudentsEndPoints(start_year, end_year);
    initStudentDashboard(end_points, true);
});

document.getElementById("monograph-tab").addEventListener("click", function() {
    end_points = getMonographEndPoints();
    initMonographDashboard(end_points);
});

document.getElementById("bt_monograph_update").addEventListener("click", () => {
    let start_year = document.getElementById("monograph_start_year").value;
    let end_year = document.getElementById("monograph_end_year").value;
    end_points = getMonographEndPoints(start_year, end_year);
    initMonographDashboard(end_points, true);
});

// document.getElementById("nets-tab").addEventListener("click", function() {
//     if (netsPPG == null) {
//         netsPPG = getPPGNetwork(end_points["ppg_network"], ppg_acronym);
//     }
// });

// document.getElementById("bt_update").addEventListener("click", () => {
//     var start_year = document.getElementById("start_year").value;
//     var end_year = document.getElementById("end_year").value;
//     updateDashboard(ppg_acronym, start_year, end_year);
// });