
function DateSwitcher() {
  if (!DateSwitcher.id) DateSwitcher.id = 0;

  var id = DateSwitcher.id++;

  var dispatcher = d3.dispatch("dateChanged"),
      currentDate;

  // Properties
  var data;

  function view(container) {

    if (container.selectAll('*').empty()) {
      container.append('li')
        .append('a')
          .classed('change-day', true)
          .classed('decrement', true)
          .classed('disabled', true)
          .attr('href', '#')
          .on('click', function () {
            d3.event.preventDefault();
            if (!d3.select(this).classed('disabled') && currentDateIdx < data.length) {
              view.changeDate(data[currentDateIdx+1].key);
            }
          })
        .append('i')
          .classed('icon-chevron-left', true);


      var mainLi = container.append('li');
      
      var dropDownLink = mainLi.append('a')
          .classed('calendar-menu-toggle', true)
          .classed('dropdown-toggle', true)
          .attr('href', '#calendar-menu')
          .on('click', function () {
            d3.event.preventDefault();

            var el = d3.select((d3.select(this).attr('href')));
            
            var open = el.classed('open');
            el.style('opacity', (open) ? '1' : '0' );
            el.classed('open', !open);
            el.transition()
              .duration(250)
              .style('opacity', (open) ? '0' : '1');
          });


      dropDownLink.append('span')
        .attr('id', 'selected-time');
      dropDownLink.append('i')
          .classed('icon-chevron-down', true);

      mainLi.append('span')
          .classed('dropdown', true)
        .append('div')
          .attr('id', 'calendar-menu')
          .classed('dropdown-menu', true)
          .classed('pull-right', true)
          .classed('calendar-menu', true)
        .append('ul')
          .attr('id', 'date-selector');

      container.append('li')
        .append('a')
          .classed('change-day', true)
          .classed('increment', true)
          .classed('disabled', true)
          .attr('href', '#')
          .on('click', function () {
            d3.event.preventDefault();
            if (!d3.select(this).classed('disabled') && currentDateIdx > 0) {
              view.changeDate(data[currentDateIdx-1].key);
            }
          })
        .append('i')
          .classed('icon-chevron-right', true);
    }

    var days = d3.select('#date-selector')
      .selectAll('.day')
      .data(data);

    days.enter().append('li')
      .classed('day', true)
      .on('click', function (d,i) {
        d3.event.preventDefault();
        view.changeDate(d.key);
      })
      .append('a')
        .attr('href', '#')
        .attr('data-date', function (d) { return "_"+d3.time.day(d.key).valueOf(); })
        .attr('data-events', function (d) { return d.value; })
      .text(function (d) { return d.key.toDateString() + " ("+d.value+")"; });
    
    view.changeDate(new Date(parseInt(d3.select('#date-selector li:first-child a').attr('data-date').slice('1'), 10)));
  }

  view.data = function (_) {
    if (!arguments.length) return data;
    data = _;
    return view;
  };

  view.changeDate = function(date) {
    data.forEach(function (d, i) { 
      if (d.key.getTime() == date.getTime()) currentDateIdx = i;
    });

    var selectedTime = d3.time.format("%A %b %e, %Y")(data[currentDateIdx].key);
    d3.select('#selected-time').text(selectedTime);

    d3.selectAll('#date-selector li').classed('selected', false);
    d3.select(d3.select('li [data-date=_'+date.getTime()+']')[0][0].parentElement).classed('selected', true);

    if (date.getTime() == data[0].key.getTime()) {
      d3.select('.change-day.increment').classed('disabled', true);
    } else {
      d3.select('.change-day.increment').classed('disabled', false);
    }
    if (date.getTime() == data[data.length-1].key.getTime()) {
      d3.select('.change-day.decrement').classed('disabled', true);
    } else {
      d3.select('.change-day.decrement').classed('disabled', false);
    }
        
    dispatcher.dateChanged(date);
  };

  return d3.rebind(view, dispatcher, 'on');
}