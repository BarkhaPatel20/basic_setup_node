 var ctx = document.getElementById("chart-doughnut").getContext('2d');
var myChart = new Chart(ctx, {
  type: 'doughnut',// chart type
  data: {
    labels:['Red','Blue','Yellow'],
    datasets:[{
      data:[100, 50, 40],
      label:'Color',
      backgroundColor:['#F06292','#7986CB','#FFD54F'],
      borderWidth: 0,// division line width. (default=1)
    }],
  },//data setting
  options:{
    legend:{
      display: true, // show legend (true/false)
      position:'right',//legend positon (top/bottom/left/right)
      labels: {
        usePointStyle: false,//choose legend shape.(true/false)
        boxWidth: 40, // width of coloured box(default=40). If you use {usePointStyle: true}, you can not this option.  
        fontSize: 15, 
        fontColor:'#FF5722', // legend font color
        padding: 30 , // Padding between labels.
      }
    },
    responsive: false, // (true/false) responsive divice width
    tooltips: false, // (true/false) default=true
    cutoutPercentage: 40, // empty space percentage of doughnut's center
    layout:{
      padding: 30
    },
  },
});