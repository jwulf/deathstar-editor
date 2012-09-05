

function commenceFiringSequence(){
// Deathstar initialization function

  $('#myTab a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });

  initializeTopicEditPage()
}

